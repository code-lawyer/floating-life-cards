import { describe, expect, it } from 'vitest';
import { validateContent } from './contentValidation';
import { ADULT_EVENTS, CHAPTERS, GROWTH_EVENTS } from './content';
import { ALL_ADULT_EVENTS, ECHO_ADULT_EVENTS } from './story';
import { STARTING_IDENTITIES } from './identities';
import { getPrototypeChapter } from './prototype';

describe('游戏内容自洽性', () => {
  it('当前全部内容通过校验', () => {
    const result = validateContent();

    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('每张记忆牌至少能进入一类成长画像', () => {
    // 全部标签都没被桥接的牌，对起手身份推导没有任何贡献。
    const deadCards = validateContent().errors.filter((error) => error.includes('全部未被桥接'));

    expect(deadCards).toEqual([]);
  });

  it('每个章节的世界意图足够覆盖它的轮次', () => {
    // reduceGame 推进回合时直接取 intents[round]，少一条就是运行时崩溃。
    for (const chapter of CHAPTERS) {
      expect(chapter.intents.length, chapter.id).toBeGreaterThanOrEqual(chapter.rounds);
    }
    for (const identity of STARTING_IDENTITIES) {
      const chapter = getPrototypeChapter(identity.id);
      expect(chapter.intents.length, identity.id).toBeGreaterThanOrEqual(chapter.rounds);
    }
  });

  it('童年每个选择都能抽出卡牌与代价', () => {
    // takeOne 对空数组返回 undefined，并会被非空断言吞掉。
    for (const event of GROWTH_EVENTS) {
      for (const choice of event.choices) {
        expect(choice.cards.length, `${event.age}-${choice.id}`).toBeGreaterThan(0);
        expect(choice.costs.length, `${event.age}-${choice.id}`).toBeGreaterThan(0);
      }
    }
  });

  it.each([1, 2])('第%i章的条件回响不能补足基础随机池', (chapterIndex) => {
    expect(validateContent().valid).toBe(true);
    const base = [...ADULT_EVENTS];
    const all = [...ALL_ADULT_EVENTS];
    const removedIds = new Set(base.filter((event) => event.afterChapter === chapterIndex).slice(1).map((event) => event.id));
    try {
      for (const pool of [ADULT_EVENTS, ALL_ADULT_EVENTS]) {
        const retained = pool.filter((event) => !removedIds.has(event.id));
        pool.splice(0, pool.length, ...retained);
      }
      expect(ADULT_EVENTS.filter((event) => event.afterChapter === chapterIndex)).toHaveLength(1);
      expect(ALL_ADULT_EVENTS.filter((event) => event.afterChapter === chapterIndex)).toHaveLength(2);
      expect(ECHO_ADULT_EVENTS.some((event) => event.afterChapter === chapterIndex)).toBe(true);
      const report = validateContent();
      expect(report.valid).toBe(false);
      expect(report.errors.some((error) => error.includes(`第 ${chapterIndex} 章之后`) && error.includes('1 个'))).toBe(true);
    } finally {
      ADULT_EVENTS.splice(0, ADULT_EVENTS.length, ...base);
      ALL_ADULT_EVENTS.splice(0, ALL_ADULT_EVENTS.length, ...all);
    }
    expect(validateContent().valid).toBe(true);
  });
});
