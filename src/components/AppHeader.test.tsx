import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppHeader } from './AppHeader';
import { createGame } from '../game/game';

function Harness() {
  const [endpoint, setEndpoint] = useState('http://localhost:8787/old');
  return <AppHeader state={createGame(1)} endpoint={endpoint} setEndpoint={setEndpoint} onGuide={() => {}} onReset={() => {}} />;
}

function openSettings() {
  fireEvent.click(screen.getByRole('button', { name: '设置' }));
  fireEvent.click(screen.getByText('开发者接入：连接 LLM 叙事裁判'));
}

function pendingFetch() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => { resolve = done; });
  const fetch = vi.fn<typeof window.fetch>().mockReturnValue(promise);
  vi.stubGlobal('fetch', fetch);
  return { fetch, resolve };
}

describe('叙事连接测试的请求归属', () => {
  it('更换端点并发起新测试后，旧响应不能覆盖新测试状态', async () => {
    const pending = pendingFetch();
    render(<Harness />);
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: '测试端点' }));
    const oldSignal = pending.fetch.mock.calls[0]![1]!.signal!;
    fireEvent.change(screen.getByRole('textbox', { name: '中转端点 URL' }), { target: { value: 'http://localhost:8787/new' } });
    expect(oldSignal.aborted).toBe(true);
    let resolveNew!: (response: Response) => void;
    pending.fetch.mockReturnValueOnce(new Promise<Response>((resolve) => { resolveNew = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: '测试端点' }));
    await act(async () => pending.resolve(new Response(JSON.stringify({ text: '旧端点的有效回答。' }))));
    expect(screen.getByRole('button', { name: '正在测试…' })).toBeDisabled();
    expect(screen.queryByText('连接成功，远程叙事已启用。')).not.toBeInTheDocument();
    await act(async () => resolveNew(new Response('{}')));
    expect(screen.getByText('没有收到有效文字。检查中转服务、模型配置与地址。')).toBeInTheDocument();
  });

  it('关闭设置取消请求，重开后不会显示迟到的连接成功', async () => {
    const pending = pendingFetch();
    render(<Harness />);
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: '测试端点' }));
    const signal = pending.fetch.mock.calls[0]![1]!.signal!;
    fireEvent.click(screen.getByRole('button', { name: '关闭设置' }));
    expect(signal.aborted).toBe(true);
    openSettings();
    await act(async () => pending.resolve(new Response(JSON.stringify({ text: '迟到的回答。' }))));
    expect(screen.getByText('尚未测试。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '测试端点' })).toBeEnabled();
  });

  it('离开游戏页时取消尚未完成的连接测试', () => {
    const pending = pendingFetch();
    const { unmount } = render(<Harness />);
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: '测试端点' }));
    const signal = pending.fetch.mock.calls[0]![1]!.signal!;
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('当前端点的正常响应仍显示成功并恢复操作', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: '当前端点的回答。' }))));
    render(<Harness />);
    openSettings();
    fireEvent.click(screen.getByRole('button', { name: '测试端点' }));
    await waitFor(() => expect(screen.getByText('连接成功，远程叙事已启用。')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '测试端点' })).toBeEnabled();
  });
});
