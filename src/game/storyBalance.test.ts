import { describe, expect, it } from 'vitest';
import { canChooseAdultChoice, createGame, getAdultChoices, getAdultEvent, getGrowthEvent, previewCardPlay, reduceGame } from './game';
import type { GameState, Resources } from './types';

function assertResourceBounds(resources: Resources) {
  for (const value of Object.values(resources)) expect(value).toBeGreaterThanOrEqual(0);
  for (const value of Object.values(resources)) expect(value).toBeLessThanOrEqual(9);
}

function completeStory(seed: number): GameState {
  let state = reduceGame(createGame(seed), { type: 'BEGIN' });
  state = reduceGame(state, { type: 'ACCEPT_ORIGIN' });

  while (state.phase === 'growth' || state.phase === 'growth-result') {
    if (state.phase === 'growth') {
      const event = getGrowthEvent(state)!;
      const choice = event.choices[(seed + event.age) % event.choices.length]!;
      state = reduceGame(state, { type: 'CHOOSE_GROWTH', choiceId: choice.id });
    } else {
      state = reduceGame(state, { type: 'CONTINUE_GROWTH' });
    }
    assertResourceBounds(state.resources);
  }

  state = reduceGame(state, { type: 'CONFIRM_DECK' });
  state = reduceGame(state, { type: 'BEGIN_ADVENTURE' });
  let safety = 0;
  while (state.phase !== 'ending' && safety < 200) {
    if (state.phase === 'encounter') {
      const cards = state.encounter!.hand.map((id) => state.cards.find((card) => card.id === id)!);
      const card = seed % 2 === 0
        ? cards.sort((left, right) => previewCardPlay(state, right)!.playerScore - previewCardPlay(state, left)!.playerScore)[0]!
        : cards[(seed + state.encounter!.round) % cards.length]!;
      state = reduceGame(state, { type: 'PLAY_CARD', cardId: card.id });
    } else if (state.phase === 'encounter-result') {
      state = reduceGame(state, { type: 'CONTINUE_ADVENTURE' });
    } else if (state.phase === 'adult-event') {
      const event = getAdultEvent(state)!;
      const choices = getAdultChoices(state).filter((choice) => canChooseAdultChoice(state, choice));
      const choice = choices[(seed + state.adultEventsResolved.length) % choices.length]!;
      state = reduceGame(state, { type: 'CHOOSE_ADULT_EVENT', choiceId: choice.id });
      expect(state.phase, `seed ${seed} 应能解决成年事件「${event.title}」`).toBe('adult-result');
    } else if (state.phase === 'adult-result') {
      state = reduceGame(state, { type: 'CONTINUE_ADULT_EVENT' });
    }
    assertResourceBounds(state.resources);
    safety += 1;
  }
  expect(safety, `seed ${seed} 不应陷入状态死循环`).toBeLessThan(200);
  return state;
}

describe('正式人生批量平衡护栏', () => {
  it('1000个确定性人生都不会透支、锁死或缺失身份与结局', () => {
    const identities = new Set<string>();
    const chapterOutcomes = new Set<boolean>();
    for (let seed = 1; seed <= 1000; seed += 1) {
      const state = completeStory(seed);
      expect(state.phase).toBe('ending');
      expect(state.startingIdentity).not.toBeNull();
      expect(state.ending).not.toBeNull();
      identities.add(state.startingIdentity!);
      state.chapterResults.forEach((won) => chapterOutcomes.add(won));
    }
    expect(identities).toEqual(new Set(['elite-graduate', 'technical-worker', 'gig-worker']));
    expect(chapterOutcomes).toEqual(new Set([true, false]));
  }, 30_000);
});
