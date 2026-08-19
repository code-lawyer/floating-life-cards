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
    localStorage.setItem('floating-life-cards.save.v4', '{broken');
    expect(loadGame()).toBeNull();
    localStorage.setItem('floating-life-cards.save.v4', JSON.stringify({ version: 3 }));
    expect(loadGame()).toBeNull();
  });

  it('拒绝身份或回忆状态不合法的v4存档', () => {
    const missingIdentity = { ...createGame(11) } as Partial<ReturnType<typeof createGame>>;
    delete missingIdentity.startingIdentity;
    localStorage.setItem('floating-life-cards.save.v4', JSON.stringify(missingIdentity));
    expect(loadGame()).toBeNull();

    localStorage.setItem('floating-life-cards.save.v4', JSON.stringify({
      ...createGame(11),
      startingIdentity: 'unknown-job',
    }));
    expect(loadGame()).toBeNull();

    localStorage.setItem('floating-life-cards.save.v4', JSON.stringify({
      ...createGame(11),
      encounter: { memoryPile: 'not-an-array', warmthUsed: false, warmthCardId: null },
    }));
    expect(loadGame()).toBeNull();
  });
});
