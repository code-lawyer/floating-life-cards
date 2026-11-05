/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ADULT_EVENTS, CHAPTERS, GROWTH_EVENTS } from './content';
import { getAdultEventSceneVisual, getChapterSceneVisual, getGrowthSceneVisual, getSceneVisual } from './visuals';
import { ECHO_ADULT_EVENTS, GROWTH_CONTINUATIONS } from './story';

function expectFilesToExist(sources: string[]) {
  for (const source of sources) {
    expect(existsSync(resolve('public', source.replace(/^\.\//, ''))), source).toBe(true);
  }
}

describe('剧情视觉注册表', () => {
  it('回响使用明确的旧物画面，新增事件没有丢失图像引用', () => {
    const visuals = [
      ...ECHO_ADULT_EVENTS.map((event) => getAdultEventSceneVisual(event.id, event.age, event.title)),
      ...GROWTH_CONTINUATIONS.map(({ event }) => getGrowthSceneVisual(event.artAge ?? event.age, event.title)),
    ];
    expectFilesToExist(visuals.map((visual) => visual.src));
    expect(visuals[0]!.src).toBe(getGrowthSceneVisual(9, '旧货摊上的机器').src);
  });
  it('每个童年事件都有独立图片而不是泛用占位图', () => {
    const visuals = GROWTH_EVENTS.map((event) => getGrowthSceneVisual(event.age, event.title));

    expect(new Set(visuals.map((visual) => visual.id)).size).toBe(GROWTH_EVENTS.length);
    expect(new Set(visuals.map((visual) => visual.src)).size).toBe(GROWTH_EVENTS.length);
    expect(visuals.map((visual) => visual.src)).toEqual(
      GROWTH_EVENTS.map((event) => `./art/growth-${String(event.age).padStart(2, '0')}-v1.webp`),
    );
    expectFilesToExist(visuals.map((visual) => visual.src));
  });

  it('每场正式成年牌局都有独立主画面，合同原型也保持隔离', () => {
    const chapterVisuals = CHAPTERS.map((chapter) => getChapterSceneVisual(chapter.id, chapter.title));

    expect(new Set(chapterVisuals.map((visual) => visual.id)).size).toBe(CHAPTERS.length);
    expect(new Set(chapterVisuals.map((visual) => visual.src)).size).toBe(CHAPTERS.length);
    expect(getChapterSceneVisual('contract-terms', '合同上没有写的事').src).toBe('./art/contract-key-art-v1.webp');
    expectFilesToExist([...chapterVisuals.map((visual) => visual.src), getChapterSceneVisual('contract-terms', '合同上没有写的事').src]);
  });

  it('每个成年生活事件都有独立背景图', () => {
    const visuals = ADULT_EVENTS.map((event) => getAdultEventSceneVisual(event.id, event.age, event.title));

    expect(new Set(visuals.map((visual) => visual.id)).size).toBe(ADULT_EVENTS.length);
    expect(new Set(visuals.map((visual) => visual.src)).size).toBe(ADULT_EVENTS.length);
    expect(visuals.map((visual) => visual.src)).toEqual(
      ADULT_EVENTS.map((event) => `./art/adult-${event.id}-v1.webp`),
    );
    expectFilesToExist(visuals.map((visual) => visual.src));
    expectFilesToExist(['origin', 'deck', 'ending'].map((id) => getSceneVisual(id as 'origin' | 'deck' | 'ending').src));
  });

  it('每张剧情视觉都声明桌面裁切、移动焦点和色调', () => {
    const visuals = [
      ...GROWTH_EVENTS.map((event) => getGrowthSceneVisual(event.age, event.title)),
      ...CHAPTERS.map((chapter) => getChapterSceneVisual(chapter.id, chapter.title)),
      ...ADULT_EVENTS.map((event) => getAdultEventSceneVisual(event.id, event.age, event.title)),
    ];

    for (const visual of visuals) {
      expect(visual.desktopPosition).toMatch(/^\d+% \d+%$/);
      expect(visual.mobilePosition).toMatch(/^\d+% \d+%$/);
      expect(visual.tone).toMatch(/^(childhood|threshold|adult|aftermath)$/);
    }
  });
});
