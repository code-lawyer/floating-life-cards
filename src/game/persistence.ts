import type { GameState, StartingIdentityId } from './types';
import { getStartingIdentity } from './identities';

const SAVE_KEY = 'floating-life-cards.save.v4';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isValidEncounter(value: unknown, cardIds: Set<string>): boolean {
  if (value === null) return true;
  if (!value || typeof value !== 'object') return false;
  const encounter = value as Record<string, unknown>;
  if (!isStringArray(encounter.drawPile) || !isStringArray(encounter.hand) || !isStringArray(encounter.memoryPile)) return false;
  if (typeof encounter.warmthUsed !== 'boolean') return false;
  if (encounter.warmthCardId !== null && typeof encounter.warmthCardId !== 'string') return false;
  if (encounter.warmthUsed !== (typeof encounter.warmthCardId === 'string')) return false;
  return [...encounter.drawPile, ...encounter.hand, ...encounter.memoryPile]
    .every((cardId) => cardIds.has(cardId))
    && (encounter.warmthCardId === null || cardIds.has(encounter.warmthCardId as string));
}

function isValidGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  if (state.version !== 4 || (state.mode !== 'story' && state.mode !== 'prototype') || typeof state.seed !== 'number' || typeof state.phase !== 'string' || !Array.isArray(state.cards)) return false;
  if (!('startingIdentity' in state)) return false;
  if (state.startingIdentity !== null && (typeof state.startingIdentity !== 'string' || !getStartingIdentity(state.startingIdentity as StartingIdentityId))) return false;
  if (!state.cards.every((card) => Boolean(card) && typeof card === 'object' && typeof (card as Record<string, unknown>).id === 'string')) return false;
  const cardIds = new Set(state.cards.map((card) => (card as Record<string, unknown>).id as string));
  if (!isStringArray(state.selectedDeck) || !state.selectedDeck.every((cardId) => cardIds.has(cardId))) return false;
  return isValidEncounter(state.encounter, cardIds);
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // The game remains fully playable when storage is unavailable.
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const state: unknown = JSON.parse(raw);
    return isValidGameState(state) ? state : null;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // No action needed.
  }
}
