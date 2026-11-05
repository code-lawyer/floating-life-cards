import { canChooseAdultChoice, createGame, getAdultChoices, getGrowthEvent, previewCardPlay, reduceGame } from '../game/game';
import type { GameState } from '../game/types';

/** 由真实规则生成的完整故事，覆盖每个保存时点；不拼装阶段载荷。 */
export function makeStoryStates(edition: GameState['storyEdition'] = 'echoes'): GameState[] {
  let state = createGame(851);
  const states = [state];
  for (let step = 0; step < 200 && state.phase !== 'ending'; step += 1) {
    switch (state.phase) {
      case 'title': state = { ...reduceGame(state, { type: 'BEGIN' }), storyEdition: edition }; break;
      case 'origin': state = reduceGame(state, { type: 'ACCEPT_ORIGIN' }); break;
      case 'growth': {
        const event = getGrowthEvent(state)!;
        state = reduceGame(state, { type: 'CHOOSE_GROWTH', choiceId: event.choices[(event.age - 4) % 3]!.id });
        break;
      }
      case 'growth-result': state = reduceGame(state, { type: 'CONTINUE_GROWTH' }); break;
      case 'deck': state = reduceGame(state, { type: 'CONFIRM_DECK' }); break;
      case 'interlude': state = reduceGame(state, { type: 'CONFIRM_INTERLUDE' }); break;
      case 'identity': state = reduceGame(state, { type: 'BEGIN_ADVENTURE' }); break;
      case 'encounter': {
        const cards = state.encounter!.hand.map((id) => state.cards.find((card) => card.id === id)!);
        cards.sort((left, right) => previewCardPlay(state, right)!.playerScore - previewCardPlay(state, left)!.playerScore);
        state = reduceGame(state, { type: 'PLAY_CARD', cardId: cards[0]!.id });
        break;
      }
      case 'encounter-result': state = reduceGame(state, { type: 'CONTINUE_ADVENTURE' }); break;
      case 'adult-event': {
        const choices = getAdultChoices(state).filter((choice) => canChooseAdultChoice(state, choice));
        choices.sort((left, right) => (right.changes.heart ?? 0) - (left.changes.heart ?? 0));
        state = reduceGame(state, { type: 'CHOOSE_ADULT_EVENT', choiceId: choices[0]!.id });
        break;
      }
      case 'adult-result': state = reduceGame(state, { type: 'CONTINUE_ADULT_EVENT' }); break;
    }
    states.push(state);
  }
  if (state.phase !== 'ending' || state.chapterResults.length !== 5) throw new Error('完整故事测试样本未走完五章');
  return states;
}
