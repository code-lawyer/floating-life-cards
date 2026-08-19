import type { GameState } from './types';

const SAVE_KEY = 'floating-life-cards.save.v2';

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
    const state = JSON.parse(raw) as Partial<GameState>;
    if (state.version !== 2 || typeof state.seed !== 'number' || typeof state.phase !== 'string' || !Array.isArray(state.cards)) return null;
    return state as GameState;
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
