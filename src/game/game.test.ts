import { describe, expect, it } from 'vitest';
import { approachRelation, canChooseAdultChoice, createGame, getAdultEvent, getGrowthEvent, previewCardPlay, reduceGame } from './game';
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
    expect(state.encounter?.discard).toContain(cardId);
    expect(state.encounter?.progress).toBeGreaterThanOrEqual(0);
    expect(state.encounter?.records[0]?.playerScore).toBe(preview.playerScore);
    expect(state.encounter?.records[0]?.worldScore).toBe(preview.worldScore);
    expect(preview.modifiers[0]?.label).toBe('卡牌基础');
    expect(Object.values(state.resources).every((value) => value >= 0 && value <= 9)).toBe(true);
  });

  it('每场牌局允许一次换手，并按规则收取压力', () => {
    let state = reduceGame(growUp(84), { type: 'BEGIN_ADVENTURE' });
    const originalHand = state.encounter!.hand;
    const pressure = state.resources.pressure;
    state = reduceGame(state, { type: 'REDRAW_HAND' });
    expect(state.encounter?.redrawUsed).toBe(true);
    expect(state.encounter?.hand).toHaveLength(4);
    expect(state.encounter?.hand).not.toEqual(originalHand);
    expect(state.resources.pressure).toBe(Math.min(9, pressure + 1));
    expect(reduceGame(state, { type: 'REDRAW_HAND' })).toBe(state);
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
