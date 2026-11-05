import packageInfo from '../../package.json';
import { isValidGameState, migrateLegacyStory } from './saveValidation';
import type { GameMode, GameState } from './types';

const STORY_SAVE_KEY = 'floating-life-cards.save.v7';
const LEGACY_STORY_SAVE_KEYS = ['floating-life-cards.save.v6', 'floating-life-cards.save.v5', 'floating-life-cards.save.v4'];
const PROTOTYPE_SAVE_KEY = 'floating-life-cards.prototype.v7';

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
    for (const legacyKey of LEGACY_STORY_SAVE_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;
      let migrated: unknown;
      try { migrated = migrateLegacyStory(JSON.parse(legacyRaw)); } catch { continue; }
      if (!isValidGameState(migrated, mode)) continue;
      // 回写失败只影响持久化；旧故事保持原有内容，不补写未发生的回响。
      saveGame(migrated);
      return migrated;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSave(mode: GameMode = 'story'): void {
  try {
    localStorage.removeItem(mode === 'prototype' ? PROTOTYPE_SAVE_KEY : STORY_SAVE_KEY);
    if (mode === 'story') LEGACY_STORY_SAVE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // No action needed.
  }
}
