import { createGame, reduceGame } from './game';
import type { GameAction, GameState, StartingIdentityId } from './types';

type PrototypeDecisionKind = 'play' | 'redraw' | 'recall';

interface PrototypeDecision {
  kind: PrototypeDecisionKind;
  id: string;
  action: GameAction;
}

export interface PrototypeOpeningOption {
  kind: 'play' | 'redraw';
  id: string;
  label: string;
  outcome: PrototypeOutcomeEnvelope;
}

export interface PrototypeOutcomeEnvelope {
  canWin: boolean;
  canLose: boolean;
  canExhaustHeart: boolean;
  bestProgress: number;
  worstProgress: number;
  shortestWinRounds: number | null;
  winWithWarmth: boolean;
  winWithoutWarmth: boolean;
  winWithRedraw: boolean;
  winWithoutRedraw: boolean;
}

export interface PrototypeDecisionReport {
  identityId: StartingIdentityId;
  openingOptions: PrototypeOpeningOption[];
  statesExplored: number;
  outcome: PrototypeOutcomeEnvelope;
}

function legalDecisions(state: GameState): PrototypeDecision[] {
  if (state.phase !== 'encounter' || !state.encounter || state.encounter.resolved) return [];
  const decisions: PrototypeDecision[] = state.encounter.hand.map((cardId) => ({
    kind: 'play',
    id: cardId,
    action: { type: 'PLAY_CARD', cardId },
  }));
  if (!state.encounter.redrawUsed) {
    decisions.push({ kind: 'redraw', id: 'redraw', action: { type: 'REDRAW_HAND' } });
  }
  if (!state.encounter.warmthUsed) {
    decisions.push(...state.encounter.memoryPile.map((cardId) => ({
      kind: 'recall' as const,
      id: cardId,
      action: { type: 'RECALL_MEMORY' as const, cardId },
    })));
  }
  return decisions;
}

function terminalOutcome(state: GameState): PrototypeOutcomeEnvelope {
  const encounter = state.encounter!;
  const won = encounter.won;
  return {
    canWin: won,
    canLose: !won,
    canExhaustHeart: state.resources.heart <= 0,
    bestProgress: encounter.progress,
    worstProgress: encounter.progress,
    shortestWinRounds: won ? encounter.records.length : null,
    winWithWarmth: won && encounter.warmthUsed,
    winWithoutWarmth: won && !encounter.warmthUsed,
    winWithRedraw: won && encounter.redrawUsed,
    winWithoutRedraw: won && !encounter.redrawUsed,
  };
}

function mergeOutcomes(outcomes: PrototypeOutcomeEnvelope[]): PrototypeOutcomeEnvelope {
  const winningRounds = outcomes
    .map((outcome) => outcome.shortestWinRounds)
    .filter((rounds): rounds is number => rounds !== null);
  return {
    canWin: outcomes.some((outcome) => outcome.canWin),
    canLose: outcomes.some((outcome) => outcome.canLose),
    canExhaustHeart: outcomes.some((outcome) => outcome.canExhaustHeart),
    bestProgress: Math.max(...outcomes.map((outcome) => outcome.bestProgress)),
    worstProgress: Math.min(...outcomes.map((outcome) => outcome.worstProgress)),
    shortestWinRounds: winningRounds.length > 0 ? Math.min(...winningRounds) : null,
    winWithWarmth: outcomes.some((outcome) => outcome.winWithWarmth),
    winWithoutWarmth: outcomes.some((outcome) => outcome.winWithoutWarmth),
    winWithRedraw: outcomes.some((outcome) => outcome.winWithRedraw),
    winWithoutRedraw: outcomes.some((outcome) => outcome.winWithoutRedraw),
  };
}

function createOutcomeExplorer() {
  const outcomesByState = new Map<string, PrototypeOutcomeEnvelope>();

  function explore(state: GameState): PrototypeOutcomeEnvelope {
    const key = JSON.stringify(state);
    const known = outcomesByState.get(key);
    if (known) return known;
    if (state.phase === 'encounter-result') {
      const outcome = terminalOutcome(state);
      outcomesByState.set(key, outcome);
      return outcome;
    }
    const nextOutcomes = legalDecisions(state)
      .map((decision) => reduceGame(state, decision.action))
      .filter((next) => next !== state)
      .map(explore);
    if (nextOutcomes.length === 0) throw new Error('原型分析遇到没有合法行动的未结困局。');
    const outcome = mergeOutcomes(nextOutcomes);
    outcomesByState.set(key, outcome);
    return outcome;
  }

  return { explore, statesExplored: () => outcomesByState.size };
}

export function analyzePrototype(identityId: StartingIdentityId): PrototypeDecisionReport {
  const initialState = reduceGame(createGame(0), { type: 'START_PROTOTYPE', identityId });
  const explorer = createOutcomeExplorer();
  const outcome = explorer.explore(initialState);
  const openingDecisions = legalDecisions(initialState)
    .filter((decision): decision is PrototypeDecision & { kind: 'play' | 'redraw' } => decision.kind !== 'recall');
  const openingOptions = openingDecisions.map((decision) => ({
    kind: decision.kind,
    id: decision.id,
    label: decision.kind === 'redraw'
      ? '换一手'
      : initialState.cards.find((card) => card.id === decision.id)!.title,
    outcome: explorer.explore(reduceGame(initialState, decision.action)),
  }));
  return {
    identityId,
    openingOptions,
    statesExplored: explorer.statesExplored(),
    outcome,
  };
}
