import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestJudgeNarration } from './judge';

const REQUEST = {
  chapter: '没有经验的人',
  situation: '面试官要求证明自己。',
  card: { title: '不藏的试卷', memory: '先承担，再解释。', approach: '行动' as const },
  intent: { title: '资历门槛', text: '规章挡住故事。', approach: '洞察' as const },
};

afterEach(() => vi.unstubAllGlobals());

describe('可选叙事裁判', () => {
  it('空端点直接使用本地裁判', async () => {
    expect(await requestJudgeNarration('', REQUEST)).toBeNull();
  });

  it('清理远程端点返回的 Markdown 控制符', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: '**你把试卷放到桌上。**\n世界停了一秒。' }),
    }));
    expect(await requestJudgeNarration('https://judge.example', REQUEST)).toBe('你把试卷放到桌上。   世界停了一秒。');
  });

  it('远程错误会无缝退回本地文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await requestJudgeNarration('https://judge.example', REQUEST)).toBeNull();
  });
});
