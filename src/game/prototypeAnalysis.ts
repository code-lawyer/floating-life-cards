import { createGame, reduceGame } from './game';
import type { GameAction, GameState, StartingIdentityId } from './types';

type PrototypeDecisionKind = 'play' | 'redraw' | 'recall';

interface PrototypeDecision {
  kind: PrototypeDecisionKind;
  id: string;
  action: GameAction;
  nextState: GameState;
}

interface AnalysisStateKey {
  mode: GameState['mode'];
  phase: GameState['phase'];
  rng: number;
  identityId: StartingIdentityId | null;
  resources: [number, number, number, number];
  traits: [number, number, number];
  marks: ReadonlyArray<readonly [string, string, string | null, number]>;
  cardExperience: Array<[string, number]>;
  upgradedCards: string[];
  encounter: null | {
    chapterIndex: number;
    round: number;
    progress: number;
    drawPile: string[];
    hand: string[];
    memoryPile: string[];
    intentId: string;
    climate: [string, string | null, number | null];
    redrawUsed: boolean;
    warmthUsed: boolean;
    approachHistory: string[];
    lastOutcome: string | null;
    recordsLength: number;
    resolved: boolean;
    won: boolean;
  };
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
  if (!state.encounter) return [];
  const candidates: Array<Omit<PrototypeDecision, 'nextState'>> = state.encounter.hand.map((cardId) => ({
    kind: 'play',
    id: cardId,
    action: { type: 'PLAY_CARD', cardId },
  }));
  candidates.push({ kind: 'redraw', id: 'redraw', action: { type: 'REDRAW_HAND' } });
  candidates.push(...state.encounter.memoryPile.map((cardId) => ({
    kind: 'recall' as const,
    id: cardId,
    action: { type: 'RECALL_MEMORY' as const, cardId },
  })));
  return candidates
    .map((candidate) => ({ ...candidate, nextState: reduceGame(state, candidate.action) }))
    .filter((decision) => decision.nextState !== state);
}

function analysisStateKey(state: GameState): string {
  const encounter = state.encounter;
  const key: AnalysisStateKey = {
    mode: state.mode,
    phase: state.phase,
    rng: state.rng,
    identityId: state.startingIdentity,
    resources: [state.resources.heart, state.resources.money, state.resources.bonds, state.resources.pressure],
    traits: [state.traits.insight, state.traits.nerve, state.traits.empathy],
    marks: state.marks
      .map((mark) => [mark.id, mark.effect.kind, mark.effect.approach ?? null, mark.effect.amount] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
    cardExperience: Object.entries(state.cardExperience).sort(([left], [right]) => left.localeCompare(right)),
    upgradedCards: [...state.upgradedCards].sort(),
    encounter: encounter ? {
      chapterIndex: encounter.chapterIndex,
      round: encounter.round,
      progress: encounter.progress,
      drawPile: encounter.drawPile,
      hand: encounter.hand,
      memoryPile: encounter.memoryPile,
      intentId: encounter.currentIntent.id,
      climate: [encounter.climate.id, encounter.climate.approachBoost ?? null, encounter.climate.worldPower ?? null],
      redrawUsed: encounter.redrawUsed,
      warmthUsed: encounter.warmthUsed,
      approachHistory: encounter.approachHistory,
      lastOutcome: encounter.records.at(-1)?.outcome ?? null,
      recordsLength: encounter.records.length,
      resolved: encounter.resolved,
      won: encounter.won,
    } : null,
  };
  return JSON.stringify(key);
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
    const key = analysisStateKey(state);
    const known = outcomesByState.get(key);
    if (known) return known;
    if (state.phase === 'encounter-result') {
      const outcome = terminalOutcome(state);
      outcomesByState.set(key, outcome);
      return outcome;
    }
    const nextOutcomes = legalDecisions(state)
      .map((decision) => decision.nextState)
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
    outcome: explorer.explore(decision.nextState),
  }));
  return {
    identityId,
    openingOptions,
    statesExplored: explorer.statesExplored(),
    outcome,
  };
}
