import { canChooseAdultChoice, createGame, getAdultChoices, getAdultEvent, getGrowthEvent, previewCardPlay, reduceGame } from './game';
import type { GameState } from './types';

export interface StorySimulationOptions {
  edition?: GameState['storyEdition'];
  strategy?: 'mixed' | 'careful' | 'impulsive';
  /** Analysis-only counterfactual; the shipping reducer is never modified. */
  recovery?: 'current' | 'none' | 'floor3' | 'plus2' | 'floor4';
  growthChoices?: Record<number, string>;
  adultChoices?: Record<string, string>;
  repack?: 'keep' | 'rotate';
  onState?: (state: GameState) => void;
}

export function simulateStory(seed: number, options: StorySimulationOptions = {}) {
  const strategy = options.strategy ?? 'mixed';
  let state = createGame(seed);
  let adultStartHeart = -1;
  const snapshot = () => options.onState?.(state);
  snapshot();
  for (let step = 0; step < 200 && state.phase !== 'ending'; step += 1) {
    switch (state.phase) {
      case 'title': state = { ...reduceGame(state, { type: 'BEGIN' }), storyEdition: options.edition ?? 'echoes' }; break;
      case 'origin': state = reduceGame(state, { type: 'ACCEPT_ORIGIN' }); break;
      case 'growth': {
        const event = getGrowthEvent(state)!;
        const requested = options.growthChoices?.[event.age];
        const choice = requested ? event.choices.find((item) => item.id === requested) : event.choices[(seed + event.age) % event.choices.length];
        if (!choice) throw new Error(`seed ${seed}: 不存在童年选择 ${requested}`);
        state = reduceGame(state, { type: 'CHOOSE_GROWTH', choiceId: choice.id });
        break;
      }
      case 'growth-result': state = reduceGame(state, { type: 'CONTINUE_GROWTH' }); break;
      case 'deck': state = reduceGame(state, { type: 'CONFIRM_DECK' }); break;
      case 'interlude': {
        if (options.repack === 'rotate') {
          const outside = state.cards.filter((card) => !state.selectedDeck.includes(card.id));
          const replacement = outside[(seed + state.encounter!.chapterIndex) % outside.length]!;
          state = reduceGame(state, { type: 'TOGGLE_DECK', cardId: state.selectedDeck.at(-1)! });
          snapshot();
          state = reduceGame(state, { type: 'TOGGLE_DECK', cardId: replacement.id });
          snapshot();
        }
        state = reduceGame(state, { type: 'CONFIRM_INTERLUDE' });
        break;
      }
      case 'identity': {
        const previousHeart = state.resources.heart;
        state = reduceGame(state, { type: 'BEGIN_ADVENTURE' });
        const recovery = options.recovery ?? 'current';
        if (recovery !== 'current') {
          const heart = recovery === 'none' ? previousHeart
            : recovery === 'plus2' ? Math.min(9, previousHeart + 2)
              : Math.max(recovery === 'floor3' ? 3 : 4, previousHeart);
          state = { ...state, resources: { ...state.resources, heart } };
        }
        adultStartHeart = state.resources.heart;
        break;
      }
      case 'encounter': {
        const cards = state.encounter!.hand.map((id) => state.cards.find((card) => card.id === id)!);
        const greedy = strategy === 'careful' || (strategy === 'mixed' && seed % 2 === 0);
        const card = greedy
          ? cards.sort((a, b) => previewCardPlay(state, b)!.playerScore - previewCardPlay(state, a)!.playerScore)[0]!
          : cards[(seed + state.encounter!.round) % cards.length]!;
        state = reduceGame(state, { type: 'PLAY_CARD', cardId: card.id });
        break;
      }
      case 'encounter-result': state = reduceGame(state, { type: 'CONTINUE_ADVENTURE' }); break;
      case 'adult-event': {
        const event = getAdultEvent(state)!;
        const choices = getAdultChoices(state).filter((choice) => canChooseAdultChoice(state, choice));
        const requested = options.adultChoices?.[event.id];
        const choice = requested ? choices.find((item) => item.id === requested)
          : strategy === 'careful'
            ? choices.sort((a, b) => (b.changes.heart ?? 0) - (a.changes.heart ?? 0))[0]
            : choices[(seed + state.adultEventsResolved.length) % choices.length];
        if (!choice) throw new Error(`seed ${seed}: 成年事件 ${event.id} 没有可承担的选择 ${requested ?? ''}`);
        state = reduceGame(state, { type: 'CHOOSE_ADULT_EVENT', choiceId: choice.id });
        break;
      }
      case 'adult-result': state = reduceGame(state, { type: 'CONTINUE_ADULT_EVENT' }); break;
    }
    snapshot();
  }
  if (state.phase !== 'ending') throw new Error(`seed ${seed}: 人生未在200步内结束`);
  return {
    state, adultStartHeart,
    endedFirstRound: state.chapterResults.length === 1 && state.encounter?.records.length === 1,
    completedAllChapters: state.chapterResults.length === 5,
  };
}
