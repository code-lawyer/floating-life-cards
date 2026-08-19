import { describe, expect, it } from 'vitest';
import { createGame, getChapter, getRedrawPressureCost, previewCardPlay, reduceGame } from './game';
import type { Approach, GameState, LifeCard, StartingIdentityId } from './types';

const APPROACHES: Approach[] = ['洞察', '行动', '共情'];

function handCards(state: GameState): LifeCard[] {
  return state.encounter!.hand.map((id) => state.cards.find((card) => card.id === id)!);
}

function strongest(state: GameState, cards = handCards(state)): LifeCard {
  return [...cards].sort((left, right) => previewCardPlay(state, right)!.playerScore - previewCardPlay(state, left)!.playerScore)[0]!;
}

function practicedStrategy(state: GameState): LifeCard {
  const previous = state.encounter!.approachHistory.at(-1);
  const matching = previous ? handCards(state).filter((card) => card.approach === previous) : [];
  return strongest(state, matching.length > 0 ? matching : handCards(state));
}

function triadStrategy(state: GameState): LifeCard {
  const recent = state.encounter!.approachHistory.slice(-2);
  const missing = APPROACHES.filter((approach) => !recent.includes(approach));
  const candidates = recent.length > 0
    ? handCards(state).filter((card) => missing.includes(card.approach))
    : handCards(state);
  return strongest(state, candidates.length > 0 ? candidates : handCards(state));
}

function playPrototype(identityId: StartingIdentityId, choose: (state: GameState) => LifeCard): GameState {
  let state = reduceGame(createGame(0), { type: 'START_PROTOTYPE', identityId });
  let safety = 0;
  while (state.phase === 'encounter' && safety < 5) {
    state = reduceGame(state, { type: 'PLAY_CARD', cardId: choose(state).id });
    safety += 1;
  }
  return state;
}

describe('成年困局原型验收', () => {
  it('固定记忆池有10张唯一ID、8张默认牌，并只使用五类成长画像', () => {
    const state = reduceGame(createGame(0), { type: 'START_PROTOTYPE', identityId: 'elite-graduate' });
    const allowedTags = new Set(['学习', '手艺', '关系', '担当', '探索']);

    expect(state.cards).toHaveLength(10);
    expect(new Set(state.cards.map((card) => card.id)).size).toBe(10);
    expect(state.selectedDeck).toHaveLength(8);
    expect(state.cards.every((card) => card.tags.every((tag) => allowedTags.has(tag)))).toBe(true);
  });

  it('三个身份被动都能在固定原型档案中实际触发', () => {
    const elite = reduceGame(createGame(0), { type: 'START_PROTOTYPE', identityId: 'elite-graduate' });
    const technical = reduceGame(createGame(0), { type: 'START_PROTOTYPE', identityId: 'technical-worker' });
    const gig = reduceGame(createGame(0), { type: 'START_PROTOTYPE', identityId: 'gig-worker' });
    const insight = elite.cards.find((card) => card.approach === '洞察')!;
    const craft = technical.cards.find((card) => card.tags.includes('手艺'))!;

    expect(previewCardPlay(elite, insight)!.playerScore).toBe(previewCardPlay(gig, insight)!.playerScore + 1);
    expect(previewCardPlay(technical, craft)!.playerScore).toBe(previewCardPlay(gig, craft)!.playerScore + 1);
    expect(getRedrawPressureCost(gig)).toBe(0);
    expect(getRedrawPressureCost(technical)).toBe(1);
  });

  it('三个身份共享规则数值，但进入与处境相符的叙事地点', () => {
    const elite = reduceGame(createGame(0), { type: 'START_PROTOTYPE', identityId: 'elite-graduate' });
    const technical = reduceGame(createGame(0), { type: 'START_PROTOTYPE', identityId: 'technical-worker' });
    const gig = reduceGame(createGame(0), { type: 'START_PROTOTYPE', identityId: 'gig-worker' });

    expect(getChapter(elite)?.location).toContain('会议室');
    expect(getChapter(technical)?.location).toContain('站点办公室');
    expect(getChapter(gig)?.location).toContain('平台服务中心');
    expect(getChapter(elite)?.target).toBe(getChapter(gig)?.target);
    expect(getChapter(technical)?.intents).toEqual(getChapter(gig)?.intents);
  });

  it('合同原型使用固定中性条件，不引入正式故事的随机时代气候', () => {
    const state = reduceGame(createGame(0), { type: 'START_PROTOTYPE', identityId: 'elite-graduate' });

    expect(state.encounter?.climate.id).toBe('prototype-neutral');
    expect(state.encounter?.climate.worldPower).toBeUndefined();
  });

  it('惯用手与三式两条打法都能越过合同困局', () => {
    const practiced = playPrototype('technical-worker', practicedStrategy);
    const triad = playPrototype('technical-worker', triadStrategy);

    expect(practiced.phase).toBe('encounter-result');
    expect(triad.phase).toBe('encounter-result');
    expect(practiced.encounter?.won).toBe(true);
    expect(triad.encounter?.won).toBe(true);
    expect(practiced.encounter?.records.map((record) => record.cardTitle))
      .not.toEqual(triad.encounter?.records.map((record) => record.cardTitle));
  });

  it('三个身份都能用同一默认应对组完成五轮原型', () => {
    for (const identityId of ['elite-graduate', 'technical-worker', 'gig-worker'] as const) {
      const result = playPrototype(identityId, triadStrategy);
      expect(result.phase, identityId).toBe('encounter-result');
      expect(result.encounter?.records.length, identityId).toBeLessThanOrEqual(5);
      expect(result.resources.heart, identityId).toBeGreaterThan(0);
    }
  });
});
