import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

// 运行真实中转入口，替换HTTP监听和上游网络，避免测试访问模型服务或真实密钥。
const source = readFileSync(path.resolve('scripts/judge-server.mjs'), 'utf8').replace("import http from 'node:http';", '');

function requestJudge(fetch: typeof globalThis.fetch) {
  const request = Object.assign(new EventEmitter(), {
    method: 'POST', url: '/judge', headers: { origin: 'http://localhost:5173' },
    socket: { remoteAddress: '127.0.0.1' },
  });
  const response = { writeHead: vi.fn(), end: vi.fn() };
  let handleRequest!: (request: EventEmitter, res: typeof response) => Promise<void>;
  vm.runInNewContext(source, {
    http: { createServer: (handler: typeof handleRequest) => { handleRequest = handler; return { listen() {} }; } },
    process: { env: { LLM_API_KEY: 'test-placeholder', LLM_MODEL: 'test-model' } },
    Buffer, AbortController, Error, setTimeout, clearTimeout, fetch,
    console: { log() {} },
  });
  const pending = handleRequest(request, response);
  request.emit('data', Buffer.from('{}'));
  request.emit('end');
  return { pending, response };
}

afterEach(() => vi.useRealTimers());

describe('叙事中转的上游生命周期', () => {
  it.each(['响应头', '响应正文'])('等待%s时，20秒截止仍中止请求并释放计时器', async (stage) => {
    vi.useFakeTimers();
    let signal!: AbortSignal;
    let rejectPending!: (error: Error) => void;
    const waitForAbort = () => new Promise<never>((_resolve, reject) => {
      rejectPending = reject;
      signal.addEventListener('abort', () => reject(new Error('upstream timeout')), { once: true });
    });
    const fetch = vi.fn<typeof globalThis.fetch>(async (_url, options) => {
      signal = options!.signal!;
      if (stage === '响应头') return waitForAbort();
      const response = new Response();
      response.json = waitForAbort;
      return response;
    });
    const { pending, response } = requestJudge(fetch);
    try {
      await vi.advanceTimersByTimeAsync(19_999);
      expect(response.end).not.toHaveBeenCalled();
      expect(signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(signal.aborted).toBe(true);
      await pending;
      expect(response.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Judge request failed.' }));
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      rejectPending(new Error('test cleanup'));
      await pending;
    }
  });

  it.each([
    { name: '正常返回', status: 200, body: '{"choices":[{"message":{"content":"**完成。**"}}]}', expectedStatus: 200, expectedBody: { text: '完成。' } },
    { name: 'HTTP失败', status: 503, body: '{}', expectedStatus: 502, expectedBody: { error: 'LLM upstream returned 503.' } },
    { name: '正文JSON错误', status: 200, body: '{broken', expectedStatus: 400, expectedBody: { error: 'Judge request failed.' } },
  ])('$name 后释放超时计时器', async ({ status, body, expectedStatus, expectedBody }) => {
    vi.useFakeTimers();
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(body, { status }));
    const { pending, response } = requestJudge(fetch);
    await pending;
    expect(response.writeHead).toHaveBeenCalledWith(expectedStatus, expect.any(Object));
    expect(response.end).toHaveBeenCalledWith(JSON.stringify(expectedBody));
    expect(vi.getTimerCount()).toBe(0);
  });
});
