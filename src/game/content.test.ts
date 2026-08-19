import { describe, expect, it } from 'vitest';
import { ADULT_EVENTS, CHAPTERS } from './content';

describe('成年内容时间线', () => {
  it('时间跳切后的困局与穿插事件严格向前推进', () => {
    expect(CHAPTERS.map((chapter) => chapter.year)).toEqual([18, 21, 25, 30, 36]);

    for (const event of ADULT_EVENTS) {
      const currentChapter = CHAPTERS[event.afterChapter]!;
      const nextChapter = CHAPTERS[event.afterChapter + 1];
      expect(event.age, event.id).toBeGreaterThan(currentChapter.year);
      if (nextChapter) expect(event.age, event.id).toBeLessThan(nextChapter.year);
    }
  });
});
