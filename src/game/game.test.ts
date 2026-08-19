import { describe, expect, it } from 'vitest';
import { approachRelation, canChooseAdultChoice, createGame, getAdultEvent, getChapter, getGrowthEvent, getWorldPower, previewCardPlay, reduceGame } from './game';
import type { GameState } from './types';

function acceptOrigin(seed = 12345): GameState {
  let state = createGame(seed);
  state = reduceGame(state, { type: 'BEGIN' });
  return reduceGame(state, { type: 'ACCEPT_ORIGIN' });
}

function growUp(seed = 12345): GameState {
  let state = acceptOrigin(seed);
  while (state.phase === 'growth' || state.phase === 'growth-result') {
    if (state.phase === 'growth') {
      const event = getGrowthEvent(state)!;
      const choice = event.choices[(event.age - 4) % 3]!;
      state = reduceGame(state, { type: 'CHOOSE_GROWTH', choiceId: choice.id });
    } else {
      state = reduceGame(state, { type: 'CONTINUE_GROWTH' });
    }
  }
  return state;
}

describe('浮生牌局规则模块', () => {
  it('同一种子和同一行动会生成完全相同的人生', () => {
    const first = growUp(20260812);
    const second = growUp(20260812);
    expect(first).toEqual(second);
  });

  it('可用固定身份直接开始可重复的成年困局原型', () => {
    const action = { type: 'START_PROTOTYPE', identityId: 'technical-worker' } as const;
    const first = reduceGame(createGame(1), action);
    const second = reduceGame(createGame(999), action);

    expect(first).toEqual(second);
    expect(first.phase).toBe('encounter');
    expect(first.startingIdentity).toBe('technical-worker');
    expect(first.cards).toHaveLength(10);
    expect(first.selectedDeck).toHaveLength(8);
    expect(first.encounter?.hand).toHaveLength(4);
    expect(getChapter(first)?.id).toBe('contract-terms');
  });

  it('合同困局公开签字倒计时，并按轮次提高世界强度', () => {
    const state = reduceGame(createGame(1), { type: 'START_PROTOTYPE', identityId: 'elite-graduate' });
    const firstRoundPower = getWorldPower(state)!;
    const fourthRound = { ...state, encounter: { ...state.encounter!, round: 4 } };

    expect(getChapter(state)?.rule?.title).toBe('签字倒计时');
    expect(getChapter(state)?.rule?.description).toContain('世界强度 +1');
    expect(getWorldPower(fourthRound)).toBe(firstRoundPower + 3);
  });

  it('原型结果可以用同一身份和固定状态重新开始', () => {
    const initial = reduceGame(createGame(1), { type: 'START_PROTOTYPE', identityId: 'gig-worker' });
    const finished = {
      ...initial,
      phase: 'encounter-result' as const,
      encounter: { ...initial.encounter!, resolved: true },
    };
    const restarted = reduceGame(finished, { type: 'RESTART_PROTOTYPE' });

    expect(initial.mode).toBe('prototype');
    expect(restarted).toEqual(initial);
    const story = createGame(1);
    expect(story.mode).toBe('story');
    expect(reduceGame(story, { type: 'RESTART_PROTOTYPE' })).toBe(story);
  });

  it('原型入口与重开只接受各自的合法阶段', () => {
    const story = acceptOrigin(17);
    expect(reduceGame(story, { type: 'START_PROTOTYPE', identityId: 'elite-graduate' })).toBe(story);

    const playing = reduceGame(createGame(17), { type: 'START_PROTOTYPE', identityId: 'elite-graduate' });
    expect(reduceGame(playing, { type: 'RESTART_PROTOTYPE' })).toBe(playing);
  });

  it('完成十四年成长并留下十五张牌', () => {
    const state = growUp();
    expect(state.phase).toBe('deck');
    expect(state.age).toBe(17);
    expect(state.cards).toHaveLength(15);
    expect(state.selectedDeck).toHaveLength(8);
    expect(state.journal).toHaveLength(15);
    expect(Object.values(state.resources).every((value) => value >= 0 && value <= 9)).toBe(true);
    expect(state.traits.insight + state.traits.nerve + state.traits.empathy).toBe(14);
  });

  it('成长牌与所选做法同型，并拒绝非法阶段行动', () => {
    let state = acceptOrigin();
    const event = getGrowthEvent(state)!;
    const selected = event.choices[1]!;
    state = reduceGame(state, { type: 'CHOOSE_GROWTH', choiceId: selected.id });
    expect(state.growthResult?.card.approach).toBe(selected.approach);
    expect(reduceGame(state, { type: 'BEGIN_ADVENTURE' })).toBe(state);
  });

  it('执行三角克制关系', () => {
    expect(approachRelation('行动', '洞察')).toBe('advantage');
    expect(approachRelation('洞察', '共情')).toBe('advantage');
    expect(approachRelation('共情', '行动')).toBe('advantage');
    expect(approachRelation('洞察', '行动')).toBe('disadvantage');
    expect(approachRelation('行动', '行动')).toBe('even');
  });

  it('只允许携带八张牌并以四张手牌开局', () => {
    let state = growUp();
    const selected = state.selectedDeck[0]!;
    const outside = state.cards.find((card) => !state.selectedDeck.includes(card.id))!;
    state = reduceGame(state, { type: 'TOGGLE_DECK', cardId: outside.id });
    expect(state.selectedDeck).toHaveLength(8);
    state = reduceGame(state, { type: 'TOGGLE_DECK', cardId: selected });
    state = reduceGame(state, { type: 'TOGGLE_DECK', cardId: outside.id });
    expect(state.selectedDeck).toHaveLength(8);
    state = reduceGame(state, { type: 'BEGIN_ADVENTURE' });
    expect(state.phase).toBe('encounter');
    expect(getChapter(state)?.id).toBe('first-job');
    expect(state.encounter?.hand).toHaveLength(4);
    expect(state.adultSchedule).toHaveLength(10);
    expect(new Set(state.adultSchedule.map((slot) => slot.eventId)).size).toBe(10);
    for (let chapter = 0; chapter < 5; chapter += 1) {
      expect(state.adultSchedule.filter((slot) => slot.afterChapter === chapter)).toHaveLength(2);
    }
  });

  it('牌局结算推进局面、消耗手牌并留下轮次记录', () => {
    let state = reduceGame(growUp(42), { type: 'BEGIN_ADVENTURE' });
    const cardId = state.encounter!.hand[0]!;
    const card = state.cards.find((item) => item.id === cardId)!;
    const preview = previewCardPlay(state, card)!;
    state = reduceGame(state, { type: 'PLAY_CARD', cardId });
    expect(state.encounter?.records).toHaveLength(1);
    expect(state.encounter?.memoryPile).toContain(cardId);
    expect(state.encounter?.progress).toBeGreaterThanOrEqual(0);
    expect(state.encounter?.records[0]?.playerScore).toBe(preview.playerScore);
    expect(state.encounter?.records[0]?.worldScore).toBe(preview.worldScore);
    expect(preview.modifiers[0]?.label).toBe('卡牌基础');
    expect(Object.values(state.resources).every((value) => value >= 0 && value <= 9)).toBe(true);
  });

  it('三式人生状态额外推进局面，而不是额外增加牌力', () => {
    let state = reduceGame(growUp(31415), { type: 'BEGIN_ADVENTURE' });
    const cardId = state.encounter!.hand[0]!;
    const card = state.cards.find((item) => item.id === cardId)!;
    const previousApproaches = (['洞察', '行动', '共情'] as const).filter((approach) => approach !== card.approach);
    const base: GameState = {
      ...state,
      traits: { insight: 20, nerve: 20, empathy: 20 },
      encounter: {
        ...state.encounter!,
        progress: 0,
        round: 1,
        approachHistory: previousApproaches,
        currentIntent: { ...state.encounter!.currentIntent, power: 1 },
      },
      marks: [],
    };
    const marked: GameState = {
      ...base,
      marks: [{
        id: 'boundary',
        title: '清楚的边界',
        description: '每次三式组合额外推进 1。',
        tone: 'good',
        effect: { kind: 'combo', amount: 1 },
      }],
    };

    expect(previewCardPlay(marked, card)?.playerScore).toBe(previewCardPlay(base, card)?.playerScore);

    const baseResult = reduceGame(base, { type: 'PLAY_CARD', cardId });
    const markedResult = reduceGame(marked, { type: 'PLAY_CARD', cardId });
    expect(markedResult.encounter!.progress).toBe(baseResult.encounter!.progress + 1);
    expect(markedResult.encounter!.records.at(-1)?.comboText).toContain('额外推进 +1');
  });

  it('每场牌局允许一次换手，并按规则收取压力', () => {
    let state = reduceGame(growUp(84), { type: 'BEGIN_ADVENTURE' });
    const originalHand = state.encounter!.hand;
    const pressure = state.resources.pressure;
    state = reduceGame(state, { type: 'REDRAW_HAND' });
    expect(state.encounter?.redrawUsed).toBe(true);
    expect(state.encounter?.hand).toHaveLength(4);
    expect(state.encounter?.hand).not.toEqual(originalHand);
    expect(state.encounter?.memoryPile).toEqual([]);
    expect(new Set([
      ...state.encounter!.hand,
      ...state.encounter!.drawPile,
      ...state.encounter!.memoryPile,
    ])).toEqual(new Set(state.selectedDeck));
    expect(state.resources.pressure).toBe(Math.min(9, pressure + 1));
    expect(reduceGame(state, { type: 'REDRAW_HAND' })).toBe(state);
  });

  it('三个原型起手身份通过统一被动接口影响牌局', () => {
    const base = reduceGame(growUp(2026), { type: 'BEGIN_ADVENTURE' });
    const card = base.cards.find((item) => item.id === base.encounter!.hand[0])!;
    const insightCard = { ...card, approach: '洞察' as const };
    const craftCard = { ...card, tags: [...card.tags, '手艺'] };

    const elite = { ...base, startingIdentity: 'elite-graduate' as const };
    expect(previewCardPlay(elite, insightCard)!.playerScore).toBe(previewCardPlay(base, insightCard)!.playerScore + 1);

    const technical = { ...base, startingIdentity: 'technical-worker' as const };
    expect(previewCardPlay(technical, craftCard)!.playerScore).toBe(previewCardPlay(base, craftCard)!.playerScore + 1);

    const gig = { ...base, startingIdentity: 'gig-worker' as const };
    const redrawn = reduceGame(gig, { type: 'REDRAW_HAND' });
    expect(redrawn.resources.pressure).toBe(gig.resources.pressure);
  });

  it('每场可用一次童年余温召回记忆牌并缓解压力', () => {
    let state = reduceGame(growUp(2718), { type: 'BEGIN_ADVENTURE' });
    state = { ...state, resources: { ...state.resources, heart: 9, pressure: 4 } };
    const cardId = state.encounter!.hand[0]!;
    state = reduceGame(state, { type: 'PLAY_CARD', cardId });
    expect(state.phase).toBe('encounter');
    expect(state.encounter?.memoryPile).toContain(cardId);
    const pressureBeforeRecall = state.resources.pressure;

    state = reduceGame(state, { type: 'RECALL_MEMORY', cardId });
    expect(state.encounter?.warmthUsed).toBe(true);
    expect(state.encounter?.warmthCardId).toBe(cardId);
    expect(state.encounter?.hand).toContain(cardId);
    expect(state.encounter?.memoryPile).not.toContain(cardId);
    expect(state.resources.pressure).toBe(pressureBeforeRecall - 1);
    expect(reduceGame(state, { type: 'RECALL_MEMORY', cardId })).toBe(state);

    const invalidTarget = reduceGame(growUp(99), { type: 'BEGIN_ADVENTURE' });
    expect(reduceGame(invalidTarget, { type: 'RECALL_MEMORY', cardId: 'not-a-card' })).toBe(invalidTarget);
    const resolved = { ...invalidTarget, encounter: { ...invalidTarget.encounter!, resolved: true } };
    expect(reduceGame(resolved, { type: 'RECALL_MEMORY', cardId: resolved.encounter.hand[0]! })).toBe(resolved);
    const wrongPhase = growUp(99);
    expect(reduceGame(wrongPhase, { type: 'RECALL_MEMORY', cardId: wrongPhase.cards[0]!.id })).toBe(wrongPhase);
  });

  it('世界牌局结束后进入抽取的成年生活事件', () => {
    let state = growUp(9001);
    state = { ...state, traits: { insight: 20, nerve: 20, empathy: 20 } };
    state = reduceGame(state, { type: 'BEGIN_ADVENTURE' });
    while (state.phase === 'encounter') {
      state = reduceGame(state, { type: 'PLAY_CARD', cardId: state.encounter!.hand[0]! });
    }
    state = reduceGame(state, { type: 'CONTINUE_ADVENTURE' });
    expect(state.phase).toBe('adult-event');
    const event = getAdultEvent(state)!;
    const choice = event.choices.find((item) => canChooseAdultChoice(state, item))!;
    state = reduceGame(state, { type: 'CHOOSE_ADULT_EVENT', choiceId: choice.id });
    expect(state.phase).toBe('adult-result');
    expect(state.adultEventResult?.choice).toBe(choice.verb);
    state = reduceGame(state, { type: 'CONTINUE_ADULT_EVENT' });
    expect(state.adultEventsResolved).toHaveLength(1);
  });

  it('成年事件会执行资源门槛并拒绝条件不足的选择', () => {
    let state = reduceGame(growUp(71), { type: 'BEGIN_ADVENTURE' });
    state = {
      ...state,
      phase: 'adult-event',
      activeAdultEventId: 'lease-renewal',
      resources: { ...state.resources, money: 2 },
    };
    const event = getAdultEvent(state)!;
    const costly = event.choices.find((choice) => choice.requirement)!;
    expect(canChooseAdultChoice(state, costly)).toBe(false);
    expect(reduceGame(state, { type: 'CHOOSE_ADULT_EVENT', choiceId: costly.id })).toBe(state);
  });

  it('可以从出生完整推进到一种成年结局', () => {
    let state = growUp(777);
    state = {
      ...state,
      resources: { ...state.resources, heart: 9 },
      traits: { insight: 20, nerve: 20, empathy: 20 },
    };
    state = reduceGame(state, { type: 'BEGIN_ADVENTURE' });
    let safety = 0;
    while (state.phase !== 'ending' && safety < 200) {
      if (state.phase === 'encounter') {
        state = reduceGame(state, { type: 'PLAY_CARD', cardId: state.encounter!.hand[0]! });
      } else if (state.phase === 'encounter-result') {
        state = reduceGame(state, { type: 'CONTINUE_ADVENTURE' });
      } else if (state.phase === 'adult-event') {
        const event = getAdultEvent(state)!;
        const choice = event.choices.find((item) => canChooseAdultChoice(state, item))!;
        state = reduceGame(state, { type: 'CHOOSE_ADULT_EVENT', choiceId: choice.id });
      } else if (state.phase === 'adult-result') {
        state = reduceGame(state, { type: 'CONTINUE_ADULT_EVENT' });
      }
      safety += 1;
    }
    expect(state.phase).toBe('ending');
    expect(state.ending?.title).toBeTruthy();
    expect(state.chapterResults).toHaveLength(5);
    expect(state.adultEventsResolved).toHaveLength(10);
    expect(state.upgradedCards.length).toBeGreaterThan(0);
  });
});
