import { CHAPTERS, GROWTH_EVENTS } from './content';
import { ALL_ADULT_EVENTS as ADULT_EVENTS, ECHO_ADULT_EVENTS, getScheduledEcho, inferLegacyChoices, isKnownStoryChoice, remembersChoice, resolveGrowthEvent } from './story';
import { ADULT_EVENTS_PER_CHAPTER, CONSTRAINT_FALLBACK, DECK_SIZE } from './constants';
import { deriveStartingIdentity, getStartingIdentity } from './identities';
import { getPrototypeChapter } from './prototype';
import type { AdultEventSlot, AdultMark, EncounterState, GameMode, GameState, LifeCard, Phase, ResourceKey, Resources, StartingIdentityId, Traits } from './types';

const PHASES = new Set<Phase>([
  'title', 'origin', 'growth', 'growth-result', 'deck', 'identity', 'encounter', 'encounter-result',
  'adult-event', 'adult-result', 'interlude', 'ending',
]);
const RESOURCE_KEYS = ['heart', 'money', 'bonds', 'pressure'] as const;
const ADULT_PHASES: Phase[] = ['identity', 'encounter', 'encounter-result', 'adult-event', 'adult-result', 'interlude', 'ending'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isInteger(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
}

function hasStrings(value: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => typeof value[field] === 'string');
}

function isOneOf(value: unknown, options: string[]): boolean {
  return typeof value === 'string' && options.includes(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isUniqueStringArray(value: unknown): value is string[] {
  return isStringArray(value) && new Set(value).size === value.length;
}

function isApproach(value: unknown): boolean {
  return value === '洞察' || value === '行动' || value === '共情';
}

function isResourceKey(value: unknown): value is ResourceKey {
  return RESOURCE_KEYS.some((key) => value === key);
}

function isResources(value: unknown): value is Resources {
  return isRecord(value) && RESOURCE_KEYS.every((key) => isInteger(value[key], 0, 9))
    && Object.keys(value).every(isResourceKey);
}

function isTraits(value: unknown): value is Traits {
  return isRecord(value) && ['insight', 'nerve', 'empathy'].every((key) => isInteger(value[key]));
}

function isResourceChanges(value: unknown): boolean {
  return isRecord(value) && Object.entries(value).every(([key, amount]) => isResourceKey(key) && isInteger(amount, -9, 9));
}

function isValidCard(value: unknown): value is LifeCard {
  if (!isRecord(value) || !hasStrings(value, ['id', 'title', 'memory']) || !value.id
    || !isApproach(value.approach) || !isInteger(value.power) || !isInteger(value.guard)
    || !(isInteger(value.originAge, 0, 120) || value.originAge === '出身' || value.originAge === '世界')
    || !isStringArray(value.tags) || !isRecord(value.effect) || typeof value.effect.description !== 'string') return false;
  const effect = value.effect;
  if (effect.kind === 'resource') return isResourceKey(effect.resource) && isInteger(effect.amount, -9, 9);
  return effect.kind === 'draw' || effect.kind === 'echo' || effect.kind === 'steady';
}

function isValidMark(value: unknown): value is AdultMark {
  if (!isRecord(value) || !hasStrings(value, ['id', 'title', 'description']) || !value.id
    || !isOneOf(value.tone, ['good', 'bad', 'mixed']) || !isRecord(value.effect)) return false;
  const effect = value.effect;
  return isOneOf(effect.kind, ['approach', 'world', 'first-round', 'recovery', 'redraw', 'combo'])
    && isInteger(effect.amount, -9, 9)
    && (effect.approach === undefined || isApproach(effect.approach))
    && (effect.kind !== 'approach' || isApproach(effect.approach));
}

function isValidJournalEntry(value: unknown): boolean {
  return isRecord(value) && hasStrings(value, ['stamp', 'title', 'body'])
    && (value.tone === undefined || isOneOf(value.tone, ['good', 'bad', 'plain']));
}

function isValidScheduleSlot(value: unknown): value is AdultEventSlot {
  if (!isRecord(value)) return false;
  const event = ADULT_EVENTS.find((item) => item.id === value.eventId);
  return Boolean(event && value.afterChapter === event.afterChapter && value.age === event.age);
}

function isValidGrowthResult(value: unknown, cardIds: Set<string>): boolean {
  if (value === null) return true;
  return isRecord(value) && isInteger(value.age, 4, 17) && hasStrings(value, ['choice', 'text'])
    && isValidCard(value.card) && cardIds.has(value.card.id) && isRecord(value.cost)
    && isResourceKey(value.cost.resource) && isInteger(value.cost.amount, -9, 9) && typeof value.cost.text === 'string';
}

function isValidAdultResult(value: unknown, cardIds: Set<string>): boolean {
  if (value === null) return true;
  return isRecord(value) && hasStrings(value, ['eventId', 'choice', 'outcome'])
    && ADULT_EVENTS.some((event) => event.id === value.eventId) && isResourceChanges(value.changes)
    && (value.mark === null || isValidMark(value.mark))
    && (value.upgradedCardId === null || (typeof value.upgradedCardId === 'string' && cardIds.has(value.upgradedCardId)));
}

function isValidRoundRecord(value: unknown): boolean {
  return isRecord(value) && hasStrings(value, ['cardTitle', 'intentTitle', 'text'])
    && isInteger(value.playerScore) && isInteger(value.worldScore)
    && isOneOf(value.outcome, ['win', 'loss', 'draw'])
    && (value.comboText === undefined || typeof value.comboText === 'string')
    && (value.masteredCard === undefined || typeof value.masteredCard === 'string');
}

function isValidEncounter(value: unknown, deck: string[], mode: GameMode, identity: StartingIdentityId | null): value is EncounterState | null {
  if (value === null) return true;
  if (!isRecord(value) || !isInteger(value.chapterIndex, 0, mode === 'prototype' ? 0 : CHAPTERS.length - 1)) return false;
  const chapter = mode === 'prototype' ? (identity ? getPrototypeChapter(identity) : null) : CHAPTERS[value.chapterIndex];
  if (!chapter || !isInteger(value.round, 1, chapter.rounds) || !isInteger(value.progress)
    || typeof value.resolved !== 'boolean' || typeof value.won !== 'boolean'
    || (!value.resolved && value.won) || typeof value.redrawUsed !== 'boolean' || typeof value.warmthUsed !== 'boolean') return false;
  if (!isRecord(value.currentIntent) || !hasStrings(value.currentIntent, ['id', 'title', 'tell', 'text'])
    || !isApproach(value.currentIntent.approach) || !isInteger(value.currentIntent.power)
    || value.currentIntent.id !== chapter.intents[value.round - 1]?.id) return false;
  if (!isRecord(value.climate) || !hasStrings(value.climate, ['id', 'title', 'description'])
    || (value.climate.approachBoost !== undefined && !isApproach(value.climate.approachBoost))
    || (value.climate.worldPower !== undefined && !isInteger(value.climate.worldPower, -9, 9))) return false;
  if (!Array.isArray(value.records) || !value.records.every(isValidRoundRecord)
    || value.records.length !== (value.resolved ? value.round : value.round - 1)
    || !Array.isArray(value.approachHistory) || !value.approachHistory.every(isApproach)
    || value.approachHistory.length !== Math.min(3, value.records.length)) return false;
  if (!isStringArray(value.drawPile) || !isStringArray(value.hand) || !isStringArray(value.memoryPile)) return false;
  const cardZones = [...value.drawPile, ...value.hand, ...value.memoryPile];
  // 检查牌的守恒与归属，不能只检查“每张牌存在于人生牌册”。
  if (cardZones.length !== deck.length || new Set(cardZones).size !== cardZones.length
    || !cardZones.every((id) => deck.includes(id)) || (!value.resolved && value.hand.length === 0)) return false;
  return value.warmthUsed
    ? typeof value.warmthCardId === 'string' && deck.includes(value.warmthCardId)
    : value.warmthCardId === null;
}

/** 只在完整结构与跨字段引用都可用时，将外部 JSON 当作领域状态。 */
export function isValidGameState(value: unknown, expectedMode: GameMode): value is GameState {
  if (!isRecord(value) || value.version !== 7 || value.mode !== expectedMode
    || !isOneOf(value.storyEdition, ['classic', 'echoes']) || !isRecord(value.storyChoices)
    || !Object.entries(value.storyChoices).every(([key, choice]) => isKnownStoryChoice(key, choice))
    || !isInteger(value.seed, 0, 0xffffffff) || !isInteger(value.rng, 1, 0xffffffff)
    || typeof value.phase !== 'string' || !PHASES.has(value.phase as Phase)
    || !isInteger(value.age, 4, 120) || !isResources(value.resources) || !isTraits(value.traits)) return false;
  if (value.startingIdentity !== null && (typeof value.startingIdentity !== 'string'
    || !getStartingIdentity(value.startingIdentity as StartingIdentityId))) return false;
  if (!Array.isArray(value.cards) || !value.cards.every(isValidCard)) return false;
  const cardIds = new Set<string>(value.cards.map((card) => card.id));
  const storyChoices = value.storyChoices as Record<string, string>;
  if (expectedMode === 'prototype' && Object.keys(storyChoices).length !== 0) return false;
  for (const [key, choiceId] of Object.entries(storyChoices)) {
    if (!key.startsWith('growth:')) continue;
    const age = Number(key.slice(7));
    const event = resolveGrowthEvent({ age, storyChoices, storyEdition: value.storyEdition as GameState['storyEdition'] });
    if (!event?.choices.some((choice) => choice.id === choiceId)
      || !value.cards.some((card) => card.originAge === age && card.id.startsWith(`${age}-${choiceId}-`))) return false;
  }
  if (expectedMode === 'story' && value.cards.some((card) => typeof card.originAge === 'number'
    && !storyChoices[`growth:${card.originAge}`])) return false;
  if (cardIds.size !== value.cards.length || !isUniqueStringArray(value.selectedDeck) || value.selectedDeck.length > DECK_SIZE
    || !value.selectedDeck.every((id) => cardIds.has(id))) return false;
  const selectedDeck = value.selectedDeck;
  if (value.deckDraft !== null && (!isUniqueStringArray(value.deckDraft) || value.deckDraft.length > DECK_SIZE
    || !value.deckDraft.every((id) => cardIds.has(id)))) return false;
  if ((value.phase === 'interlude') !== (value.deckDraft !== null) || !Array.isArray(value.deckRevisions)) return false;
  let previousRevision: { chapterIndex: number; after: string[] } | null = null;
  for (const revision of value.deckRevisions) {
    if (!isRecord(revision) || !isInteger(revision.chapterIndex, 1, CHAPTERS.length - 1)
      || !isUniqueStringArray(revision.before) || !isUniqueStringArray(revision.after)
      || revision.before.length !== DECK_SIZE || revision.after.length !== DECK_SIZE
      || ![...revision.before, ...revision.after].every((id) => cardIds.has(id))) return false;
    if (previousRevision && (revision.chapterIndex !== previousRevision.chapterIndex + 1
      || revision.before.some((id, index) => id !== previousRevision!.after[index]))) return false;
    previousRevision = { chapterIndex: revision.chapterIndex, after: revision.after };
  }
  if (previousRevision && (expectedMode !== 'story' || value.storyEdition !== 'echoes'
    || !isRecord(value.encounter) || previousRevision.chapterIndex !== value.encounter.chapterIndex
    || previousRevision.after.some((id, index) => id !== selectedDeck[index]))) return false;
  if (!Array.isArray(value.chapterResults) || value.chapterResults.length > CHAPTERS.length
    || !value.chapterResults.every((won) => typeof won === 'boolean')
    || !Array.isArray(value.marks) || !value.marks.every(isValidMark)
    || new Set(value.marks.map((mark) => mark.id)).size !== value.marks.length
    || !Array.isArray(value.journal) || !value.journal.every(isValidJournalEntry)) return false;
  if (!isRecord(value.cardExperience) || !Object.entries(value.cardExperience).every(([id, count]) => cardIds.has(id) && isInteger(count))
    || !isUniqueStringArray(value.upgradedCards) || !value.upgradedCards.every((id) => cardIds.has(id))) return false;
  if (value.origin !== null && (!isRecord(value.origin) || !hasStrings(value.origin, ['serial', 'place', 'household', 'texture', 'keepsake', 'sentence']))) return false;
  if (!isValidGrowthResult(value.growthResult, cardIds) || !isValidAdultResult(value.adultEventResult, cardIds)
    || (value.ending !== null && (!isRecord(value.ending) || !hasStrings(value.ending, ['title', 'kicker', 'text', 'postscript'])))) return false;
  if (!Array.isArray(value.adultSchedule) || !value.adultSchedule.every(isValidScheduleSlot)
    || !isUniqueStringArray(value.adultEventsResolved)) return false;
  const adultSchedule = value.adultSchedule;
  const adultEventsResolved = value.adultEventsResolved;
  const scheduledIds = new Set<string>(adultSchedule.map((slot) => slot.eventId));
  if (expectedMode === 'story') {
    const context = { cards: value.cards, storyChoices, storyEdition: value.storyEdition as GameState['storyEdition'] };
    for (const event of ECHO_ADULT_EVENTS) {
      if (adultSchedule.length > 0 && scheduledIds.has(event.id) !== (getScheduledEcho(context, event.afterChapter)?.id === event.id)) return false;
    }
    if (value.storyEdition === 'echoes' && value.adultEventsResolved.some((id) => !storyChoices[`adult:${id}`])) return false;
  }
  for (const key of Object.keys(storyChoices).filter((item) => item.startsWith('adult:'))) {
    const id = key.slice(6);
    if (!scheduledIds.has(id) || (!value.adultEventsResolved.includes(id)
      && !(value.phase === 'adult-result' && value.activeAdultEventId === id))) return false;
    const event = ADULT_EVENTS.find((item) => item.id === id);
    const choice = event?.choices.find((item) => item.id === storyChoices[key]);
    if (choice?.memoryRequirement && !remembersChoice({ storyChoices }, choice.memoryRequirement)) return false;
    const verb = storyChoices[key] === CONSTRAINT_FALLBACK.id ? CONSTRAINT_FALLBACK.verb : choice?.verb;
    if (isRecord(value.adultEventResult) && value.adultEventResult.eventId === id
      && value.adultEventResult.choice !== verb) return false;
  }
  if (scheduledIds.size !== value.adultSchedule.length || !value.adultEventsResolved.every((id) => scheduledIds.has(id))
    || (value.activeAdultEventId !== null && (typeof value.activeAdultEventId !== 'string'
      || !scheduledIds.has(value.activeAdultEventId) || value.adultEventsResolved.includes(value.activeAdultEventId)))) return false;
  if (!isValidEncounter(value.encounter, value.selectedDeck, expectedMode, value.startingIdentity as StartingIdentityId | null)) return false;

  const phase = value.phase as Phase;
  const encounter = value.encounter;
  if (expectedMode === 'story') {
    if (adultSchedule.some((slot, index) => {
      const previous = adultSchedule[index - 1];
      return previous && (slot.afterChapter < previous.afterChapter
        || (slot.afterChapter === previous.afterChapter && slot.age < previous.age));
    }) || adultEventsResolved.some((id, index) => adultSchedule[index]?.eventId !== id)) return false;
    if (!encounter) {
      if (adultSchedule.length > 0 || adultEventsResolved.length > 0 || value.activeAdultEventId !== null) return false;
    } else {
      const beforeChapter = encounter.chapterIndex * ADULT_EVENTS_PER_CHAPTER;
      const afterChapter = beforeChapter + ADULT_EVENTS_PER_CHAPTER;
      const completed = adultEventsResolved.length;
      if (completed < beforeChapter || completed > afterChapter) return false;
      if ((phase === 'encounter' || phase === 'encounter-result') && completed !== beforeChapter) return false;
      if (phase === 'adult-event' || phase === 'adult-result') {
        if (completed >= afterChapter || value.activeAdultEventId !== adultSchedule[completed]?.eventId) return false;
      } else if (value.activeAdultEventId !== null) return false;
      if (phase === 'interlude' && completed !== afterChapter) return false;
      if (phase === 'ending' && value.resources.heart > 0
        && (encounter.chapterIndex !== CHAPTERS.length - 1 || completed !== afterChapter)) return false;
    }
  }
  if (ADULT_PHASES.includes(phase) && (value.startingIdentity === null || value.selectedDeck.length !== DECK_SIZE)) return false;
  if (expectedMode === 'prototype') {
    if (!['encounter', 'encounter-result'].includes(phase) || value.adultSchedule.length !== 0 || value.activeAdultEventId !== null) return false;
  } else if (phase !== 'title' && value.origin === null) return false;
  if (['encounter', 'encounter-result', 'adult-event', 'adult-result', 'interlude', 'ending'].includes(phase)) {
    if (!encounter || encounter.resolved !== (phase !== 'encounter')
      || value.chapterResults.length !== encounter.chapterIndex + (encounter.resolved ? 1 : 0)) return false;
    if (expectedMode === 'story' && !CHAPTERS.every((_, index) => adultSchedule.filter((slot) => slot.afterChapter === index).length === ADULT_EVENTS_PER_CHAPTER)) return false;
  } else if (encounter !== null) return false;
  if ((phase === 'growth' || phase === 'growth-result') && !GROWTH_EVENTS.some((event) => event.age === value.age)) return false;
  if (phase === 'growth-result' && (!isRecord(value.growthResult) || value.growthResult.age !== value.age)) return false;
  if (phase === 'deck' && value.cards.length < DECK_SIZE) return false;
  if (phase === 'adult-event' || phase === 'adult-result') {
    const event = ADULT_EVENTS.find((item) => item.id === value.activeAdultEventId);
    if (!event || event.afterChapter !== encounter?.chapterIndex) return false;
  }
  if (phase === 'adult-result' && (!isRecord(value.adultEventResult) || value.adultEventResult.eventId !== value.activeAdultEventId)) return false;
  if (phase === 'adult-result' && value.storyEdition === 'echoes' && !storyChoices[`adult:${value.activeAdultEventId}`]) return false;
  if (phase === 'interlude' && (expectedMode !== 'story' || value.storyEdition !== 'echoes' || !encounter
    || encounter.chapterIndex >= CHAPTERS.length - 1 || value.resources.heart <= 0
    || value.activeAdultEventId !== null || value.adultEventResult !== null
    || adultSchedule.some((slot) => slot.afterChapter === encounter.chapterIndex && !adultEventsResolved.includes(slot.eventId)))) return false;
  if (phase === 'ending' && value.ending === null) return false;
  return true;
}

export function migrateLegacyStory(value: unknown): unknown {
  if (!isRecord(value) || ![4, 5, 6].includes(value.version as number) || value.mode !== 'story' || value.phase === 'interlude') return null;
  if (!Array.isArray(value.cards) || !value.cards.every(isValidCard)) return null;
  const migrated = { ...value, version: 7, deckDraft: null, deckRevisions: [],
    ...(value.version === 6 ? {} : { storyEdition: 'classic', storyChoices: inferLegacyChoices(value.cards) }),
  };
  if (typeof value.phase === 'string' && ADULT_PHASES.includes(value.phase as Phase) && value.startingIdentity === null) {
    if (!Array.isArray(value.cards) || !value.cards.every(isValidCard) || !isTraits(value.traits) || !isResources(value.resources)) return null;
    return { ...migrated, startingIdentity: deriveStartingIdentity(value.cards, value.traits, value.resources).id };
  }
  return migrated;
}
