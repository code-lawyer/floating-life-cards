export type Approach = '洞察' | '行动' | '共情';
export type MemoryTag = '学习' | '手艺' | '关系' | '担当' | '探索';
export type StartingIdentityId = 'elite-graduate' | 'technical-worker' | 'gig-worker';

export type IdentityPassive =
  | { kind: 'first-round-approach'; approach: Approach; amount: number }
  | { kind: 'card-tag'; tag: MemoryTag; amount: number }
  | { kind: 'free-first-redraw' };

export interface StartingIdentity {
  id: StartingIdentityId;
  title: string;
  description: string;
  passiveText: string;
  passive: IdentityPassive;
}

export type ResourceKey = 'heart' | 'money' | 'bonds' | 'pressure';
export type GameMode = 'story' | 'prototype';
export type Phase =
  | 'title'
  | 'origin'
  | 'growth'
  | 'growth-result'
  | 'deck'
  | 'identity'
  | 'interlude'
  | 'encounter'
  | 'encounter-result'
  | 'adult-event'
  | 'adult-result'
  | 'ending';

export interface Resources {
  heart: number;
  money: number;
  bonds: number;
  pressure: number;
}

export interface Traits {
  insight: number;
  nerve: number;
  empathy: number;
}

export type CardEffect =
  | { kind: 'resource'; resource: ResourceKey; amount: number; description: string }
  | { kind: 'draw' | 'echo' | 'steady'; description: string };

export interface LifeCard {
  id: string;
  title: string;
  approach: Approach;
  power: number;
  guard: number;
  originAge: number | '出身' | '世界';
  memory: string;
  effect: CardEffect;
  tags: string[];
}

export interface CostOption {
  resource: ResourceKey;
  amount: number;
  text: string;
}

export interface GrowthChoice {
  id: string;
  verb: string;
  detail: string;
  approach: Approach;
  trait: keyof Traits;
  cards: Array<Omit<LifeCard, 'id' | 'originAge'>>;
  costs: CostOption[];
}

export interface GrowthEvent {
  age: number;
  stage: string;
  title: string;
  text: string;
  question: string;
  choices: GrowthChoice[];
  echo?: MemoryEcho;
  artAge?: number;
}

/** A recalled event points to an actual card in this life, never an invented past. */
export interface MemoryEcho {
  sourceAge: number;
  text: string;
}

export interface MemoryRequirement {
  age: number;
  choiceIds: string[];
  text: string;
}

export interface Origin {
  serial: string;
  place: string;
  household: string;
  texture: string;
  keepsake: string;
  sentence: string;
}

export interface Intent {
  id: string;
  title: string;
  approach: Approach;
  power: number;
  tell: string;
  text: string;
}

export interface EncounterRule {
  id: string;
  title: string;
  description: string;
  effect: { kind: 'escalating-world'; amount: number };
}

export interface Chapter {
  id: string;
  year: number;
  title: string;
  location: string;
  premise: string;
  target: number;
  rounds: number;
  rule?: EncounterRule;
  intents: Intent[];
  victory: string;
  setback: string;
}

export interface WorldClimate {
  id: string;
  title: string;
  description: string;
  approachBoost?: Approach;
  worldPower?: number;
}

export interface AdultMark {
  id: string;
  title: string;
  description: string;
  tone: 'good' | 'bad' | 'mixed';
  effect: {
    kind: 'approach' | 'world' | 'first-round' | 'recovery' | 'redraw' | 'combo';
    approach?: Approach;
    amount: number;
  };
}

export interface AdultEventRequirement {
  resource: ResourceKey;
  min: number;
  text: string;
}

export interface AdultEventChoice {
  id: string;
  verb: string;
  detail: string;
  changes: Partial<Resources>;
  trait?: keyof Traits;
  requirement?: AdultEventRequirement;
  mark?: AdultMark;
  removeMark?: string;
  upgradeCard?: boolean;
  memoryRequirement?: MemoryRequirement;
  upgradeMemoryAge?: number;
  outcomes: string[];
}

export interface AdultEvent {
  id: string;
  afterChapter: number;
  age: number;
  category: string;
  title: string;
  text: string;
  question: string;
  choices: AdultEventChoice[];
  echo?: MemoryEcho;
}

export interface AdultEventSlot {
  eventId: string;
  afterChapter: number;
  age: number;
}

export interface AdultEventResult {
  eventId: string;
  choice: string;
  outcome: string;
  changes: Partial<Resources>;
  mark: AdultMark | null;
  upgradedCardId: string | null;
}

export interface RoundRecord {
  cardTitle: string;
  intentTitle: string;
  playerScore: number;
  worldScore: number;
  outcome: 'win' | 'loss' | 'draw';
  text: string;
  comboText?: string;
  masteredCard?: string;
}

export interface CombatPreview {
  playerScore: number;
  worldScore: number;
  progressBonus: number;
  relation: 'advantage' | 'disadvantage' | 'even';
  comboText?: string;
  triad: boolean;
  approachHistory: Approach[];
  modifiers: Array<{ label: string; value: number }>;
}

export interface EncounterState {
  chapterIndex: number;
  round: number;
  progress: number;
  drawPile: string[];
  hand: string[];
  memoryPile: string[];
  currentIntent: Intent;
  climate: WorldClimate;
  records: RoundRecord[];
  redrawUsed: boolean;
  warmthUsed: boolean;
  warmthCardId: string | null;
  approachHistory: Approach[];
  resolved: boolean;
  won: boolean;
}

export interface JournalEntry {
  stamp: string;
  title: string;
  body: string;
  tone?: 'good' | 'bad' | 'plain';
}

export interface GrowthResult {
  age: number;
  choice: string;
  card: LifeCard;
  cost: CostOption;
  text: string;
}

export interface Ending {
  title: string;
  kicker: string;
  text: string;
  postscript: string;
}

export interface GameState {
  version: 7;
  storyEdition: 'classic' | 'echoes';
  storyChoices: Record<string, string>;
  mode: GameMode;
  seed: number;
  rng: number;
  phase: Phase;
  origin: Origin | null;
  age: number;
  resources: Resources;
  traits: Traits;
  startingIdentity: StartingIdentityId | null;
  cards: LifeCard[];
  selectedDeck: string[];
  /** An uncommitted chapter selection; the completed encounter keeps its original deck. */
  deckDraft: string[] | null;
  deckRevisions: DeckRevision[];
  growthResult: GrowthResult | null;
  encounter: EncounterState | null;
  chapterResults: boolean[];
  adultSchedule: AdultEventSlot[];
  adultEventsResolved: string[];
  activeAdultEventId: string | null;
  adultEventResult: AdultEventResult | null;
  marks: AdultMark[];
  cardExperience: Record<string, number>;
  upgradedCards: string[];
  journal: JournalEntry[];
  ending: Ending | null;
}

export interface DeckRevision {
  chapterIndex: number;
  before: string[];
  after: string[];
}

export type GameAction =
  | { type: 'BEGIN' }
  | { type: 'ACCEPT_ORIGIN' }
  | { type: 'REROLL_ORIGIN' }
  | { type: 'CHOOSE_GROWTH'; choiceId: string }
  | { type: 'CONTINUE_GROWTH' }
  | { type: 'TOGGLE_DECK'; cardId: string }
  | { type: 'AUTO_DECK' }
  | { type: 'CONFIRM_DECK' }
  | { type: 'RESTORE_DECK' }
  | { type: 'CONFIRM_INTERLUDE' }
  | { type: 'START_PROTOTYPE'; identityId: StartingIdentityId }
  | { type: 'RESTART_PROTOTYPE' }
  | { type: 'BEGIN_ADVENTURE' }
  | { type: 'PLAY_CARD'; cardId: string; judgeText?: string }
  | { type: 'REDRAW_HAND' }
  | { type: 'RECALL_MEMORY'; cardId: string }
  | { type: 'CONTINUE_ADVENTURE' }
  | { type: 'CHOOSE_ADULT_EVENT'; choiceId: string }
  | { type: 'CONTINUE_ADULT_EVENT' }
  | { type: 'RESTART'; seed: number };
