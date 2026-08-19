import { describe, expect, it } from 'vitest';
import { createGame } from './game';
import { clearSave, loadGame, saveGame } from './persistence';

describe('本地存档', () => {
  it('可以保存、恢复并清除当前人生', () => {
    const state = createGame(9);
    saveGame(state);
    expect(loadGame()).toEqual(state);
    clearSave();
    expect(loadGame()).toBeNull();
  });

  it('忽略损坏或版本不符的存档', () => {
    localStorage.setItem('floating-life-cards.save.v2', '{broken');
    expect(loadGame()).toBeNull();
    localStorage.setItem('floating-life-cards.save.v2', JSON.stringify({ version: 1 }));
    expect(loadGame()).toBeNull();
  });
});
