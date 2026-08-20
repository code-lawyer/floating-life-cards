import packageInfo from '../../package.json';
import { deriveStartingIdentity, getStartingIdentity } from './identities';
import type { GameMode, GameState, LifeCard, Phase, Resources, StartingIdentityId, Traits } from './types';

const STORY_SAVE_KEY = 'floating-life-cards.save.v5';
const LEGACY_STORY_SAVE_KEY = 'floating-life-cards.save.v4';
const PROTOTYPE_SAVE_KEY = 'floating-life-cards.prototype.v5';
const PHASES = new Set<Phase>([
  'title', 'origin', 'growth', 'growth-result', 'deck', 'identity', 'encounter', 'encounter-result',
  'adult-event', 'adult-result', 'ending',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNullableRecord(value: unknown): boolean {
  return value === null || isRecord(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidEncounter(value: unknown, cardIds: Set<string>): boolean {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  const encounter = value;
  if (!isStringArray(encounter.drawPile) || !isStringArray(encounter.hand) || !isStringArray(encounter.memoryPile)) return false;
  if (!Number.isInteger(encounter.chapterIndex) || !Number.isInteger(encounter.round)
    || !isFiniteNumber(encounter.progress) || !Array.isArray(encounter.records)
    || typeof encounter.redrawUsed !== 'boolean' || typeof encounter.warmthUsed !== 'boolean'
    || !isStringArray(encounter.approachHistory) || typeof encounter.resolved !== 'boolean'
    || typeof encounter.won !== 'boolean' || !isRecord(encounter.currentIntent) || !isRecord(encounter.climate)) return false;
  if (encounter.warmthCardId !== null && typeof encounter.warmthCardId !== 'string') return false;
  if (encounter.warmthUsed !== (typeof encounter.warmthCardId === 'string')) return false;
  const cardZones = [...encounter.drawPile, ...encounter.hand, ...encounter.memoryPile];
  return cardZones.every((cardId) => cardIds.has(cardId))
    && new Set(cardZones).size === cardZones.length
    && (encounter.warmthCardId === null || cardIds.has(encounter.warmthCardId as string));
}

function hasNumericFields(value: unknown, fields: string[]): boolean {
  return isRecord(value) && fields.every((field) => isFiniteNumber(value[field]));
}

function isValidCard(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.id === 'string' && typeof value.title === 'string'
    && (value.approach === '洞察' || value.approach === '行动' || value.approach === '共情')
    && isFiniteNumber(value.power) && isFiniteNumber(value.guard)
    && (isFiniteNumber(value.originAge) || value.originAge === '出身' || value.originAge === '世界')
    && typeof value.memory === 'string' && isRecord(value.effect) && isStringArray(value.tags);
}

function isValidGameState(value: unknown, expectedMode: GameMode): value is GameState {
  if (!isRecord(value)) return false;
  const state = value;
  if (state.version !== 5 || state.mode !== expectedMode || !isFiniteNumber(state.seed) || !isFiniteNumber(state.rng)
    || typeof state.phase !== 'string' || !PHASES.has(state.phase as Phase) || !Array.isArray(state.cards)
    || !hasNumericFields(state.resources, ['heart', 'money', 'bonds', 'pressure'])
    || !hasNumericFields(state.traits, ['insight', 'nerve', 'empathy']) || !isFiniteNumber(state.age)) return false;
  if (!('startingIdentity' in state)) return false;
  if (state.startingIdentity !== null && (typeof state.startingIdentity !== 'string' || !getStartingIdentity(state.startingIdentity as StartingIdentityId))) return false;
  if (!state.cards.every(isValidCard)) return false;
  const cardIds = new Set(state.cards.map((card) => (card as Record<string, unknown>).id as string));
  if (cardIds.size !== state.cards.length || !isStringArray(state.selectedDeck)
    || new Set(state.selectedDeck).size !== state.selectedDeck.length
    || !state.selectedDeck.every((cardId) => cardIds.has(cardId))) return false;
  if (!Array.isArray(state.chapterResults) || !state.chapterResults.every((item) => typeof item === 'boolean')
    || !Array.isArray(state.adultSchedule) || !isStringArray(state.adultEventsResolved)
    || !Array.isArray(state.marks) || !isRecord(state.cardExperience) || !isStringArray(state.upgradedCards)
    || !Array.isArray(state.journal) || !isNullableRecord(state.origin) || !isNullableRecord(state.growthResult)
    || !isNullableRecord(state.adultEventResult) || !isNullableRecord(state.ending)
    || (state.activeAdultEventId !== null && typeof state.activeAdultEventId !== 'string')) return false;
  if (!('encounter' in state) || !isValidEncounter(state.encounter, cardIds)) return false;
  const phase = state.phase as Phase;
  const encounter = state.encounter as Record<string, unknown> | null;
  const identityPhases: Phase[] = ['identity', 'encounter', 'encounter-result', 'adult-event', 'adult-result', 'ending'];
  if (identityPhases.includes(phase) && state.startingIdentity === null) return false;
  if (identityPhases.includes(phase) && state.selectedDeck.length !== 8) return false;
  if ((phase === 'encounter' || phase === 'encounter-result') && encounter === null) return false;
  if (phase === 'encounter' && encounter?.resolved !== false) return false;
  if (phase === 'encounter-result' && encounter?.resolved !== true) return false;
  if (['title', 'origin', 'growth', 'growth-result', 'deck', 'identity'].includes(phase) && encounter !== null) return false;
  if (expectedMode === 'prototype' && (!state.startingIdentity || !['encounter', 'encounter-result'].includes(phase))) return false;
  if (expectedMode === 'story' && phase !== 'title' && state.origin === null) return false;
  if (phase === 'growth-result' && state.growthResult === null) return false;
  if ((phase === 'adult-event' || phase === 'adult-result') && typeof state.activeAdultEventId !== 'string') return false;
  if (phase === 'adult-result' && state.adultEventResult === null) return false;
  if (phase === 'ending' && state.ending === null) return false;
  return true;
}

function migrateLegacyStory(value: unknown): unknown {
  if (!isRecord(value) || value.version !== 4 || value.mode !== 'story') return null;
  const migrated: Record<string, unknown> = { ...value, version: 5 };
  const phase = migrated.phase;
  const needsIdentity = typeof phase === 'string'
    && ['identity', 'encounter', 'encounter-result', 'adult-event', 'adult-result', 'ending'].includes(phase);
  if (needsIdentity && migrated.startingIdentity === null) {
    if (!Array.isArray(migrated.cards) || !migrated.cards.every(isValidCard)
      || !hasNumericFields(migrated.traits, ['insight', 'nerve', 'empathy'])
      || !hasNumericFields(migrated.resources, ['heart', 'money', 'bonds', 'pressure'])) return null;
    migrated.startingIdentity = deriveStartingIdentity(
      migrated.cards as LifeCard[],
      migrated.traits as unknown as Traits,
      migrated.resources as unknown as Resources,
    ).id;
  }
  return migrated;
}

export function saveGame(state: GameState): void {
  try {
    if (state.mode === 'prototype') {
      localStorage.setItem(PROTOTYPE_SAVE_KEY, JSON.stringify({ buildVersion: packageInfo.version, state }));
    } else {
      localStorage.setItem(STORY_SAVE_KEY, JSON.stringify(state));
    }
  } catch {
    // The game remains fully playable when storage is unavailable.
  }
}

export function loadGame(mode: GameMode = 'story'): GameState | null {
  try {
    const key = mode === 'prototype' ? PROTOTYPE_SAVE_KEY : STORY_SAVE_KEY;
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (mode === 'prototype') {
      if (!parsed || typeof parsed !== 'object') return null;
      const envelope = parsed as Record<string, unknown>;
      if (envelope.buildVersion !== packageInfo.version) return null;
      return isValidGameState(envelope.state, mode) ? envelope.state : null;
    }
    if (isValidGameState(parsed, mode)) return parsed;
    const legacyRaw = localStorage.getItem(LEGACY_STORY_SAVE_KEY);
    if (!legacyRaw) return null;
    const migrated = migrateLegacyStory(JSON.parse(legacyRaw));
    if (!isValidGameState(migrated, mode)) return null;
    localStorage.setItem(STORY_SAVE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return null;
  }
}

export function clearSave(mode: GameMode = 'story'): void {
  try {
    localStorage.removeItem(mode === 'prototype' ? PROTOTYPE_SAVE_KEY : STORY_SAVE_KEY);
    if (mode === 'story') localStorage.removeItem(LEGACY_STORY_SAVE_KEY);
  } catch {
    // No action needed.
  }
}
