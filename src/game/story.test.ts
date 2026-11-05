import { describe, expect, it } from 'vitest';
import { canChooseAdultChoice, getAdultChoices, getAdultEvent, getGrowthEvent, reduceGame } from './game';
import { loadGame, saveGame } from './persistence';
import { isValidGameState, migrateLegacyStory } from './saveValidation';
import { ALL_ADULT_EVENTS, getDepartureRecovery, getLifeThreads, personalPostscript } from './story';
import { simulateStory } from './storySimulation';
import type { GameState, Phase } from './types';

const decisions = { 8: '8c', 9: '9a', 10: '10r-a', 12: '12f-a' };
const states: GameState[] = [];
const finished = simulateStory(1, {
  strategy: 'careful', growthChoices: decisions,
  adultChoices: { 'repair-call': 'trace', 'old-classmate': 'ask' },
  onState: (state) => states.push(state),
}).state;
const at = (phase: Phase, id?: string) => states.find((state) => state.phase === phase && (!id || state.activeAdultEventId === id))!;
const ordinaryStates: GameState[] = [];
const ordinary = simulateStory(1, {
  strategy: 'careful', growthChoices: { 8: '8a', 9: '9b' }, onState: (state) => ordinaryStates.push(state),
}).state;

describe('童年与成年的故事因果', () => {
  it('提前结卷不能补入尚未抵达的未来决定，即使它在排程中且满足记忆门槛', () => {
    const early = simulateStory(3, { strategy: 'impulsive', growthChoices: decisions }).state;
    expect(early.phase).toBe('ending');
    expect(early.encounter!.chapterIndex).toBe(1);
    expect(early.resources.heart).toBe(0);
    expect(isValidGameState(early, 'story')).toBe(true);
    saveGame(early);
    expect(loadGame()).toEqual(early);
    const corrupt = { ...early, adultEventsResolved: [...early.adultEventsResolved, 'old-classmate'],
      storyChoices: { ...early.storyChoices, 'adult:old-classmate': 'ask' } };
    expect(isValidGameState(corrupt, 'story')).toBe(false);
    saveGame(corrupt);
    expect(loadGame()).toBeNull();
  });

  it('成年生活必须按排程顺序发生，不能跳过同章前一件事', () => {
    const before = states.find((state) => state.phase === 'adult-event')!;
    const second = before.adultSchedule[1]!;
    expect(isValidGameState(before, 'story')).toBe(true);
    expect(isValidGameState({ ...before, activeAdultEventId: second.eventId }, 'story')).toBe(false);
    const resolved = [...finished.adultEventsResolved];
    [resolved[0], resolved[1]] = [resolved[1]!, resolved[0]!];
    expect(isValidGameState({ ...finished, adultEventsResolved: resolved }, 'story')).toBe(false);
    const schedule = [...finished.adultSchedule];
    [schedule[0], schedule[2]] = [schedule[2]!, schedule[0]!];
    expect(isValidGameState({ ...finished, adultSchedule: schedule }, 'story')).toBe(false);
  });

  it('连续补齐未来事件也不能越过已经抵达的章节', () => {
    const early = simulateStory(3, { strategy: 'impulsive', growthChoices: decisions }).state;
    const resolved = finished.adultEventsResolved;
    const corrupt = { ...early, adultSchedule: finished.adultSchedule, adultEventsResolved: resolved,
      storyChoices: { ...early.storyChoices, ...Object.fromEntries(Object.entries(finished.storyChoices).filter(([key]) => key.startsWith('adult:'))) } };
    expect(isValidGameState(early, 'story')).toBe(true);
    expect(isValidGameState(corrupt, 'story')).toBe(false);
  });

  it('相同种子与选择可以重现完整的两条回响', () => {
    const second = simulateStory(1, { strategy: 'careful', growthChoices: decisions, adultChoices: { 'repair-call': 'trace', 'old-classmate': 'ask' } });
    expect(second.state).toEqual(finished);
    expect(finished.adultEventsResolved).toHaveLength(10);
    expect(getLifeThreads(finished).map((thread) => thread.choice)).toEqual(['拿出当年的排查顺序', '先问他最需要哪一种帮助']);
    for (const state of states) expect(isValidGameState(state, 'story'), `${state.phase}/${state.age}`).toBe(true);
  });

  it('改变早年的决定会改变后续童年事件，不只改变属性', () => {
    const normal: GameState[] = [];
    simulateStory(1, { strategy: 'careful', growthChoices: { 8: '8a', 9: '9b' }, onState: (s) => normal.push(s) });
    expect(getGrowthEvent(states.find((s) => s.phase === 'growth' && s.age === 10)!)?.title).toBe('杂音里的第二个下午');
    expect(getGrowthEvent(normal.find((s) => s.phase === 'growth' && s.age === 10)!)?.title).toBe('三道杠');
    expect(getGrowthEvent(states.find((s) => s.phase === 'growth' && s.age === 12)!)?.title).toBe('寄到旧座位的信');
    expect(getGrowthEvent(normal.find((s) => s.phase === 'growth' && s.age === 12)!)?.title).toBe('缺一个人的毕业照');
    expect(normal.at(-1)!.adultSchedule.some((slot) => slot.eventId === 'repair-call' || slot.eventId === 'old-classmate')).toBe(false);
  });

  it('回响替换同章的一个随机事件，保留十件事与可用排程', () => {
    const schedule = at('encounter').adultSchedule;
    expect(new Set(schedule.map((slot) => slot.eventId)).size).toBe(10);
    for (let index = 0; index < 5; index += 1) expect(schedule.filter((slot) => slot.afterChapter === index)).toHaveLength(2);
    expect(schedule.some((slot) => slot.eventId === 'repair-call')).toBe(true);
    expect(schedule.some((slot) => slot.eventId === 'old-classmate')).toBe(true);
  });

  it('特殊应对既需要真正的过去，也需要支付得起现在的代价', () => {
    const state = at('adult-event', 'repair-call');
    const choice = getAdultEvent(state)!.choices.find((item) => item.id === 'trace')!;
    expect(canChooseAdultChoice(state, choice)).toBe(true);
    const differentPast = { ...state, storyChoices: { ...state.storyChoices, 'growth:10': '10r-b' } };
    expect(canChooseAdultChoice(differentPast, choice)).toBe(false);
    expect(reduceGame(differentPast, { type: 'CHOOSE_ADULT_EVENT', choiceId: choice.id })).toBe(differentPast);
    const exhausted = { ...state, resources: { ...state.resources, heart: 0 } };
    expect(canChooseAdultChoice(exhausted, choice)).toBe(false);
    expect(reduceGame(exhausted, { type: 'CHOOSE_ADULT_EVENT', choiceId: choice.id })).toBe(exhausted);
  });

  it('重新理解的是那段具体经历，重复点击不会再次扣费', () => {
    const before = at('adult-event', 'repair-call');
    const after = reduceGame(before, { type: 'CHOOSE_ADULT_EVENT', choiceId: 'trace' });
    const memory = before.cards.find((card) => card.originAge === 10)!;
    expect(after.upgradedCards).toContain(memory.id);
    expect(after.resources.heart).toBe(before.resources.heart - 1);
    expect(after.storyChoices['adult:repair-call']).toBe('trace');
    expect(reduceGame(after, { type: 'CHOOSE_ADULT_EVENT', choiceId: 'trace' })).toBe(after);
  });

  it('回响分支和成年决定在每个保存时点都能恢复', () => {
    for (const state of states) {
      saveGame(state);
      expect(loadGame()).toEqual(state);
    }
  });

  it('拒绝虚构的童年决定、未发生的成年决定与缺失历史', () => {
    const state = at('encounter');
    const badStates = [
      { ...state, storyChoices: undefined },
      { ...state, storyChoices: {} },
      { ...state, storyEdition: 'unknown' },
      { ...state, storyChoices: { ...state.storyChoices, 'growth:10': '10r-b' } },
      { ...state, storyChoices: { ...state.storyChoices, 'adult:repair-call': 'trace' } },
      { ...state, storyChoices: { ...state.storyChoices, 'growth:100': 'invented' } },
    ];
    expect(isValidGameState(state, 'story')).toBe(true);
    for (const corrupt of badStates) expect(isValidGameState(corrupt, 'story')).toBe(false);
  });

  it('没有经历到的成年回声不会被写成已经发生', () => {
    const threads = getLifeThreads(at('identity'));
    expect(threads).toHaveLength(2);
    expect(threads.every((thread) => thread.choice === null && thread.outcome === null)).toBe(true);
    expect(personalPostscript(at('identity'))).not.toContain('最终选择');
    expect(finished.ending?.postscript).toContain('拿出当年的排查顺序');
    expect(finished.ending?.postscript).toContain('次');
  });

  it('没有特殊回响的普通人生也会回顾最近的真实成年决定', () => {
    expect(isValidGameState(ordinary, 'story')).toBe(true);
    expect(getLifeThreads(ordinary)).toEqual([]);
    expect(ordinary.adultEventsResolved).toHaveLength(10);
    const lastEvent = ALL_ADULT_EVENTS.find((event) => event.id === ordinary.adultEventsResolved.at(-1))!;
    const choice = lastEvent.choices.find((item) => item.id === ordinary.storyChoices[`adult:${lastEvent.id}`])!;
    const mostUsed = ordinary.cards.reduce((best, card) => (ordinary.cardExperience[card.id] ?? 0) > (ordinary.cardExperience[best.id] ?? 0) ? card : best);
    expect(ordinary.ending!.postscript).toContain(mostUsed.title);
    expect(ordinary.ending!.postscript).toContain(lastEvent.title);
    expect(ordinary.ending!.postscript).toContain(choice.verb);
    saveGame(ordinary);
    expect(loadGame()?.ending).toEqual(ordinary.ending);
  });

  it('普通尾声不提前回顾尚未完成的成年事件', () => {
    const before = ordinaryStates.find((state) => state.phase === 'adult-event')!;
    const result = reduceGame(before, { type: 'CHOOSE_ADULT_EVENT', choiceId: getAdultChoices(before).find((choice) => canChooseAdultChoice(before, choice))!.id });
    expect(result.phase).toBe('adult-result');
    expect(result.adultEventsResolved).toEqual([]);
    expect(personalPostscript(result)).not.toContain('最终选择');
  });

  it('无法承担原选项时如实保存被动决定，并在结局回顾这份限制', () => {
    const before = ordinaryStates.find((state) => state.phase === 'adult-event' && state.activeAdultEventId === 'friend-loan')!;
    const constrained = { ...before, resources: { heart: 0, money: 0, bonds: 0, pressure: 0 } };
    expect(getAdultChoices(constrained).filter((choice) => canChooseAdultChoice(constrained, choice)).map((choice) => choice.id)).toEqual(['constraint-fallback']);
    const result = reduceGame(constrained, { type: 'CHOOSE_ADULT_EVENT', choiceId: 'constraint-fallback' });
    expect(isValidGameState(result, 'story')).toBe(true);
    saveGame(result);
    expect(loadGame()).toEqual(result);
    const ending = reduceGame(result, { type: 'CONTINUE_ADULT_EVENT' });
    expect(ending.phase).toBe('ending');
    expect(isValidGameState(ending, 'story')).toBe(true);
    expect(ending.ending!.postscript).toContain('朋友开口借钱');
    expect(ending.ending!.postscript).toContain('先让现实替你决定');
  });

  it.each<{ eventId: string; growthChoices: Record<number, string>; forbiddenChoice: string }>([
    { eventId: 'repair-call', growthChoices: { 9: '9a', 10: '10r-b' }, forbiddenChoice: 'trace' },
    { eventId: 'old-classmate', growthChoices: { 8: '8c', 12: '12f-b' }, forbiddenChoice: 'ask' },
  ])('拒绝缺少记忆前提的 $eventId 决定，包括结果页与结局存档', ({ eventId, growthChoices, forbiddenChoice }) => {
    const checkpoints: GameState[] = [];
    const ending = simulateStory(1, { strategy: 'careful', growthChoices, onState: (state) => checkpoints.push(state) }).state;
    const result = checkpoints.find((state) => state.phase === 'adult-result' && state.activeAdultEventId === eventId)!;
    for (const valid of [result, ending]) {
      expect(isValidGameState(valid, 'story')).toBe(true);
      saveGame(valid);
      expect(loadGame()).toEqual(valid);
      const corrupt = { ...valid, storyChoices: { ...valid.storyChoices, [`adult:${eventId}`]: forbiddenChoice } };
      expect(isValidGameState(corrupt, 'story')).toBe(false);
      saveGame(corrupt);
      expect(loadGame()).toBeNull();
    }
  });

  it('已记录选择必须与成年结果的文案一致，即使另一个选择也没有记忆门槛', () => {
    const result = at('adult-result', 'repair-call');
    expect(isValidGameState(result, 'story')).toBe(true);
    const changedChoice = { ...result, storyChoices: { ...result.storyChoices, 'adult:repair-call': 'share' } };
    const changedResult = { ...result, adultEventResult: { ...result.adultEventResult!, choice: '请师傅分担一半排查' } };
    expect(isValidGameState(changedChoice, 'story')).toBe(false);
    expect(isValidGameState(changedResult, 'story')).toBe(false);
  });
});

describe('启程休整与旧人生的边界', () => {
  it.each([4, 5])('v%i没有成年选择事实的旧结果与结局仍能恢复，不补造决定', (version) => {
    const classicStates: GameState[] = [];
    simulateStory(1, { edition: 'classic', strategy: 'careful', onState: (state) => classicStates.push(state) });
    const checkpoints = classicStates.filter((state) => state.phase === 'adult-result' || state.phase === 'ending');
    expect(checkpoints.length).toBeGreaterThan(1);
    for (const original of checkpoints) {
      localStorage.clear();
      const legacy: Record<string, unknown> = { ...original, version };
      delete legacy.storyChoices; delete legacy.storyEdition;
      delete legacy.deckDraft; delete legacy.deckRevisions;
      localStorage.setItem(`floating-life-cards.save.v${version}`, JSON.stringify(legacy));
      const loaded = loadGame()!;
      expect(isValidGameState(loaded, 'story')).toBe(true);
      expect(loaded.adultEventResult).toEqual(original.adultEventResult);
      expect(loaded.adultEventsResolved).toEqual(original.adultEventsResolved);
      expect(Object.keys(loaded.storyChoices).every((key) => key.startsWith('growth:'))).toBe(true);
      expect(personalPostscript(loaded)).toBeNull();
      if (loaded.phase === 'adult-result') expect(isValidGameState(reduceGame(loaded, { type: 'CONTINUE_ADULT_EVENT' }), 'story')).toBe(true);
    }
  });

  it.each([0, 1, 2, 3, 7])('心气为%i时只补到最低3点，且不能重复领取', (heart) => {
    const before = { ...at('identity'), resources: { ...at('identity').resources, heart } };
    const after = reduceGame(before, { type: 'BEGIN_ADVENTURE' });
    expect(getDepartureRecovery(before)).toBe(Math.max(0, 3 - heart));
    expect(after.resources.heart).toBe(Math.max(3, heart));
    expect(after.resources.money).toBe(before.resources.money);
    expect(reduceGame(after, { type: 'BEGIN_ADVENTURE' })).toBe(after);
  });

  it.each([4, 5])('真实v%i结构迁移保留原故事，不替玩家补写分支与休整', (version) => {
    const classic: GameState[] = [];
    simulateStory(1, { edition: 'classic', strategy: 'careful', growthChoices: { 8: '8c', 9: '9a' }, onState: (s) => classic.push(s) });
    const original = classic.find((s) => s.phase === 'growth' && s.age === 10)!;
    const legacy: Record<string, unknown> = { ...original, version };
    delete legacy.storyChoices;
    delete legacy.storyEdition;
    localStorage.setItem(`floating-life-cards.save.v${version}`, JSON.stringify(legacy));
    const loaded = loadGame()!;
    expect(loaded.version).toBe(7);
    expect(loaded.storyEdition).toBe('classic');
    expect(loaded.resources).toEqual(original.resources);
    expect(getGrowthEvent(loaded)?.title).toBe('三道杠');
    expect(getDepartureRecovery(loaded)).toBe(0);
    expect(isValidGameState(migrateLegacyStory(legacy), 'story')).toBe(true);
    expect(localStorage.getItem(`floating-life-cards.save.v${version}`)).not.toBeNull();
  });
});
