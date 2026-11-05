import type { Approach } from './types';

export interface JudgeRequest {
  chapter: string;
  situation: string;
  card: { title: string; memory: string; approach: Approach };
  intent: { title: string; text: string; approach: Approach };
}

interface JudgeAdapter {
  narrate(request: JudgeRequest, signal?: AbortSignal): Promise<string | null>;
}

class LocalJudge implements JudgeAdapter {
  async narrate(): Promise<null> {
    return null;
  }
}

class RemoteJudge implements JudgeAdapter {
  constructor(private readonly endpoint: string) {}

  async narrate(request: JudgeRequest, signal?: AbortSignal): Promise<string | null> {
    if (signal?.aborted) return null;
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'floating-life-cards-narration',
          instruction: '用不超过70个汉字，以克制的现实主义口吻描述这张成长牌如何回应当前局面。不要宣布输赢，不要使用Markdown。',
          ...request,
        }),
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { text?: unknown };
      if (typeof payload.text !== 'string') return null;
      return payload.text.replace(/[\r\n#*_`]/g, ' ').trim().slice(0, 140) || null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }
}

export async function requestJudgeNarration(endpoint: string, request: JudgeRequest, signal?: AbortSignal): Promise<string | null> {
  const adapter: JudgeAdapter = endpoint.trim() ? new RemoteJudge(endpoint.trim()) : new LocalJudge();
  return adapter.narrate(request, signal);
}
