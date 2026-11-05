import { describe, expect, it, vi } from 'vitest';
import { canConfirmInterlude, getChapterRecovery, getNextChapter, reduceGame } from './game';
import { loadGame, saveGame } from './persistence';
import { isValidGameState, migrateLegacyStory } from './saveValidation';
import { simulateStory } from './storySimulation';
import type { GameState } from './types';

const states: GameState[] = [];
const completed = simulateStory(2, { strategy: 'careful', onState: (state) => states.push(state) }).state;
const first = states.find((state) => state.phase === 'interlude')!;
const incoming = first.cards.find((card) => !first.selectedDeck.includes(card.id))!;
const outgoing = first.selectedDeck[0]!;
const chooseReplacement = (state: GameState) => reduceGame(reduceGame(state, { type: 'TOGGLE_DECK', cardId: outgoing }), { type: 'TOGGLE_DECK', cardId: incoming.id });

describe('章节间重新整理行囊', () => {
  it('完成本章生活后才停下整理，四次转换保持五章与十件生活事件', () => {
    const interludes = states.filter((state) => state.phase === 'interlude');
    expect(interludes.map((state) => getNextChapter(state)?.year)).toEqual([21, 25, 30, 36]);
    expect(completed.chapterResults).toHaveLength(5);
    expect(completed.adultEventsResolved).toHaveLength(10);
    expect(completed.deckRevisions.map((revision) => revision.chapterIndex)).toEqual([1, 2, 3, 4]);
    for (const state of interludes) {
      expect(state.encounter?.resolved).toBe(true);
      expect(state.deckDraft).toEqual(state.selectedDeck);
      expect(state.adultSchedule.filter((slot) => slot.afterChapter === state.encounter!.chapterIndex)
        .every((slot) => state.adultEventsResolved.includes(slot.eventId))).toBe(true);
    }
  });

  it('编辑只改变草稿；牌册、上一场牌堆、熟练和淬炼均保留', () => {
    const experienced = { ...first, cardExperience: { ...first.cardExperience, [incoming.id]: 1 }, upgradedCards: [...new Set([...first.upgradedCards, incoming.id])] };
    const edited = chooseReplacement(experienced);
    expect(edited.selectedDeck).toEqual(first.selectedDeck);
    expect(edited.encounter).toEqual(first.encounter);
    expect(edited.cards).toEqual(first.cards);
    expect(edited.rng).toBe(first.rng);
    expect(edited.resources).toEqual(first.resources);
    expect(edited.deckDraft).toContain(incoming.id);
    expect(edited.deckDraft).not.toContain(outgoing);
    const next = reduceGame(edited, { type: 'CONFIRM_INTERLUDE' });
    expect(next.phase).toBe('encounter');
    expect(next.encounter?.chapterIndex).toBe(1);
    expect(next.selectedDeck).toEqual(edited.deckDraft);
    expect([...next.encounter!.hand, ...next.encounter!.drawPile, ...next.encounter!.memoryPile].sort()).toEqual([...next.selectedDeck].sort());
    expect(next.cards).toEqual(first.cards);
    expect(next.cardExperience[incoming.id]).toBe(1);
    expect(next.upgradedCards).toContain(incoming.id);
    expect(next.deckRevisions[0]).toEqual({ chapterIndex: 1, before: first.selectedDeck, after: edited.deckDraft });
    expect(next.journal.find((entry) => entry.stamp === '21 岁 · 重新上路')?.body).toContain(incoming.title);
  });

  it('数量、归属与阶段都受规则保护；恢复原牌组不发放资源或记录', () => {
    expect(reduceGame(first, { type: 'TOGGLE_DECK', cardId: incoming.id })).toBe(first);
    expect(reduceGame(first, { type: 'TOGGLE_DECK', cardId: 'missing' })).toBe(first);
    const short = reduceGame(first, { type: 'TOGGLE_DECK', cardId: outgoing });
    expect(canConfirmInterlude(short)).toBe(false);
    expect(reduceGame(short, { type: 'CONFIRM_INTERLUDE' })).toBe(short);
    const restored = reduceGame(short, { type: 'RESTORE_DECK' });
    expect(restored).toEqual(first);
    for (const invalid of [
      { ...first, deckDraft: [...first.selectedDeck.slice(1), 'missing'] },
      { ...first, deckDraft: Array(8).fill(outgoing) },
      { ...first, resources: { ...first.resources, heart: 0 } },
      { ...first, adultEventsResolved: [] },
    ]) expect(reduceGame(invalid, { type: 'CONFIRM_INTERLUDE' })).toBe(invalid);
    const next = reduceGame(first, { type: 'CONFIRM_INTERLUDE' });
    expect(reduceGame(next, { type: 'TOGGLE_DECK', cardId: outgoing })).toBe(next);
    expect(reduceGame(next, { type: 'CONFIRM_INTERLUDE' })).toBe(next);
    expect(reduceGame(next, { type: 'RESTORE_DECK' })).toBe(next);
  });

  it('实际恢复与预告一致，受上限和人生状态影响且不能重复领取', () => {
    const before = { ...first, resources: { ...first.resources, heart: 8, pressure: 0 }, marks: [{ id: 'recovery-test', title: '休息', description: '恢复+1', tone: 'good' as const, effect: { kind: 'recovery' as const, amount: 1 } }] };
    expect(getChapterRecovery(before)).toEqual({ heart: 1, pressure: 0 });
    const next = reduceGame(before, { type: 'CONFIRM_INTERLUDE' });
    expect(next.resources).toEqual({ ...before.resources, heart: 9 });
    expect(reduceGame(next, { type: 'CONFIRM_INTERLUDE' })).toBe(next);
  });

  it('七张草稿与替换后的下一场都能刷新恢复', () => {
    const short = reduceGame(first, { type: 'TOGGLE_DECK', cardId: outgoing });
    for (const state of [first, short, chooseReplacement(first), reduceGame(chooseReplacement(first), { type: 'CONFIRM_INTERLUDE' })]) {
      expect(isValidGameState(state, 'story')).toBe(true);
      saveGame(state);
      expect(loadGame()).toEqual(state);
    }
  });

  it('拒绝伪造草稿、跨阶段草稿和不连贯的换牌历史', () => {
    const next = reduceGame(chooseReplacement(first), { type: 'CONFIRM_INTERLUDE' });
    const invalid: unknown[] = [
      { ...first, deckDraft: null }, { ...first, deckDraft: ['missing'] },
      { ...first, deckDraft: [outgoing, outgoing] },
      { ...first, adultEventsResolved: first.adultEventsResolved.slice(1) },
      { ...next, deckDraft: next.selectedDeck },
      { ...next, deckRevisions: [{ ...next.deckRevisions[0], chapterIndex: 4 }] },
      { ...next, deckRevisions: [{ ...next.deckRevisions[0], after: first.selectedDeck }] },
      { ...next, deckRevisions: [{ ...next.deckRevisions[0], before: [outgoing] }] },
      { ...completed, deckRevisions: completed.deckRevisions.filter((item) => item.chapterIndex !== 2) },
    ];
    for (const state of invalid) expect(isValidGameState(state, 'story')).toBe(false);
  });

  it('v6成年进度原位迁移，下一次转换可整理且不伪造以前的换牌', () => {
    const original = states.filter((state) => state.phase === 'adult-result' && state.encounter?.chapterIndex === 2).at(-1)!;
    const legacy: Record<string, unknown> = { ...original, version: 6 };
    delete legacy.deckDraft; delete legacy.deckRevisions;
    const migrated = migrateLegacyStory(legacy) as GameState;
    expect(migrated).toEqual({ ...original, deckDraft: null, deckRevisions: [] });
    expect(isValidGameState(migrated, 'story')).toBe(true);
    localStorage.setItem('floating-life-cards.save.v6', JSON.stringify(legacy));
    expect(loadGame()).toEqual(migrated);
    expect(localStorage.getItem('floating-life-cards.save.v6')).not.toBeNull();
    const resumed = reduceGame(migrated, { type: 'CONTINUE_ADULT_EVENT' });
    expect(resumed.phase).toBe('interlude');
    expect(resumed.deckRevisions).toEqual([]);
  });

  it('v6迁移回写失败时仍保留可玩进度', () => {
    const original = states.find((state) => state.phase === 'adult-result')!;
    const legacy: Record<string, unknown> = { ...original, version: 6 };
    delete legacy.deckDraft; delete legacy.deckRevisions;
    localStorage.setItem('floating-life-cards.save.v6', JSON.stringify(legacy));
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    try { expect(loadGame()).toEqual(original); } finally { write.mockRestore(); }
  });

  it('经典人生与固定原型不插入新阶段', () => {
    const phases = new Set<string>();
    simulateStory(2, { edition: 'classic', strategy: 'careful', onState: (state) => phases.add(state.phase) });
    expect(phases.has('interlude')).toBe(false);
    const prototype = reduceGame(states[0]!, { type: 'START_PROTOTYPE', identityId: 'technical-worker' });
    expect(prototype.deckRevisions).toEqual([]);
    expect(reduceGame(prototype, { type: 'CONFIRM_INTERLUDE' })).toBe(prototype);
  });

  it('每章替换一张的完整人生可复现，并在所有检查点保持存档有效', () => {
    const run = () => simulateStory(4, { strategy: 'careful', repack: 'rotate', onState: (state) => {
      expect(isValidGameState(state, 'story'), state.phase).toBe(true);
    } }).state;
    expect(run()).toEqual(run());
  });
});
