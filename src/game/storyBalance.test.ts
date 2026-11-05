import { describe, expect, it } from 'vitest';
import { canChooseAdultChoice, createGame, getAdultChoices, getAdultEvent, getGrowthEvent, previewCardPlay, reduceGame } from './game';
import { isValidGameState } from './saveValidation';
import type { GameState } from './types';

function assertStateBounds(state: GameState) {
  for (const value of Object.values(state.resources)) expect(value).toBeGreaterThanOrEqual(0);
  for (const value of Object.values(state.resources)) expect(value).toBeLessThanOrEqual(9);
  expect(isValidGameState(state, 'story'), `seed ${state.seed} / ${state.phase} 的正常状态不能被存档校验误拒绝`).toBe(true);
}

function completeStory(seed: number, edition: GameState['storyEdition'] = 'echoes'): GameState {
  let state = reduceGame(createGame(seed), { type: 'BEGIN' });
  state = { ...state, storyEdition: edition };
  state = reduceGame(state, { type: 'ACCEPT_ORIGIN' });

  while (state.phase === 'growth' || state.phase === 'growth-result') {
    if (state.phase === 'growth') {
      const event = getGrowthEvent(state)!;
      const choice = event.choices[(seed + event.age) % event.choices.length]!;
      state = reduceGame(state, { type: 'CHOOSE_GROWTH', choiceId: choice.id });
    } else {
      state = reduceGame(state, { type: 'CONTINUE_GROWTH' });
    }
    assertStateBounds(state);
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
    } else if (state.phase === 'interlude') {
      state = reduceGame(state, { type: 'CONFIRM_INTERLUDE' });
    } else if (state.phase === 'adult-result') {
      state = reduceGame(state, { type: 'CONTINUE_ADULT_EVENT' });
    }
    assertStateBounds(state);
    safety += 1;
  }
  expect(safety, `seed ${seed} 不应陷入状态死循环`).toBeLessThan(200);
  return state;
}

describe('正式人生批量平衡护栏', () => {
  it('种子101完成全部事件后仍有1点心气，结局不能误判为耗尽', () => {
    const state = completeStory(101, 'classic');
    expect(state.chapterResults).toHaveLength(5);
    expect(state.adultEventsResolved).toHaveLength(10);
    expect(state.chapterResults.filter(Boolean)).toHaveLength(2);
    expect(state.resources.heart).toBe(1);
    expect(state.ending?.title).toBe('改写规则的人');
  });

  it('1000个确定性人生都不会透支、锁死或缺失身份与结局', () => {
    const identities = new Set<string>();
    const chapterOutcomes = new Set<boolean>();
    for (let seed = 1; seed <= 1000; seed += 1) {
      const state = completeStory(seed);
      expect(state.phase).toBe('ending');
      expect(state.startingIdentity).not.toBeNull();
      expect(state.ending).not.toBeNull();
      if (state.chapterResults.filter(Boolean).length < 3) {
        expect(state.ending?.title, `seed ${seed} 的心气边界应与结局一致`).toBe(
          state.resources.heart === 0 ? '暂时离席的人' : '改写规则的人',
        );
      }
      identities.add(state.startingIdentity!);
      state.chapterResults.forEach((won) => chapterOutcomes.add(won));
    }
    expect(identities).toEqual(new Set(['elite-graduate', 'technical-worker', 'gig-worker']));
    expect(chapterOutcomes).toEqual(new Set([true, false]));
  }, 30_000);

  it('大多数人生能打完全部五场世界牌局，提前力竭是少数而非常态', () => {
    // 新故事在启程时把心气补至最低3点；仍允许失败和提前结卷。
    // 自动策略只看数值可达性，真人是否理解代价由试玩单独判断。
    let completedAllChapters = 0;
    let endedAfterFirstChapter = 0;
    for (let seed = 1; seed <= 300; seed += 1) {
      const chapters = completeStory(seed).chapterResults.length;
      if (chapters === 5) completedAllChapters += 1;
      if (chapters === 1) endedAfterFirstChapter += 1;
    }

    expect(completedAllChapters + endedAfterFirstChapter).toBeGreaterThan(0);
    expect(completedAllChapters / 300, '休整后的新故事应有至少四分之三能走完五章').toBeGreaterThanOrEqual(0.75);
  }, 30_000);
});
