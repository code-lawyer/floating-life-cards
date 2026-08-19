import { describe, expect, it } from 'vitest';
import { createGame, reduceGame } from './game';
import { clearSave, loadGame, saveGame } from './persistence';

describe('本地存档', () => {
  it('可以保存、恢复并清除当前人生', () => {
    const state = createGame(9);
    saveGame(state);
    expect(loadGame()).toEqual(state);
    clearSave();
    expect(loadGame()).toBeNull();
  });

  it('正式故事与当前构建的成年原型使用独立存档槽位', () => {
    const story = reduceGame(createGame(12), { type: 'BEGIN' });
    const prototype = reduceGame(createGame(12), { type: 'START_PROTOTYPE', identityId: 'technical-worker' });

    saveGame(story);
    saveGame(prototype);

    expect(loadGame('story')).toEqual(story);
    expect(loadGame('prototype')).toEqual(prototype);
    clearSave('prototype');
    expect(loadGame('prototype')).toBeNull();
    expect(loadGame('story')).toEqual(story);
  });

  it('拒绝没有当前构建版本标记的旧原型存档', () => {
    const legacyPrototype = reduceGame(createGame(13), { type: 'START_PROTOTYPE', identityId: 'gig-worker' });
    localStorage.setItem('floating-life-cards.prototype.v4', JSON.stringify(legacyPrototype));

    expect(loadGame('prototype')).toBeNull();
  });

  it('忽略损坏或版本不符的存档', () => {
    localStorage.setItem('floating-life-cards.save.v4', '{broken');
    expect(loadGame()).toBeNull();
    localStorage.setItem('floating-life-cards.save.v4', JSON.stringify({ version: 3 }));
    expect(loadGame()).toBeNull();
  });

  it('拒绝不存在的阶段以及缺少核心字段的存档', () => {
    const invalidPhase = { ...createGame(21), phase: 'white-screen' };
    localStorage.setItem('floating-life-cards.save.v4', JSON.stringify(invalidPhase));
    expect(loadGame()).toBeNull();

    const { resources: _resources, ...missingResources } = createGame(22);
    localStorage.setItem('floating-life-cards.save.v4', JSON.stringify(missingResources));
    expect(loadGame()).toBeNull();
  });

  it('拒绝阶段与遭遇状态互相矛盾的存档', () => {
    const missingEncounter = { ...createGame(23), phase: 'encounter' };
    localStorage.setItem('floating-life-cards.save.v4', JSON.stringify(missingEncounter));
    expect(loadGame()).toBeNull();

    const playing = reduceGame(createGame(24), { type: 'START_PROTOTYPE', identityId: 'gig-worker' });
    saveGame({ ...playing, phase: 'encounter-result', encounter: { ...playing.encounter!, resolved: false } });
    expect(loadGame('prototype')).toBeNull();
  });

  it('拒绝需要阶段载荷却缺少对应结果的存档', () => {
    const missingGrowthResult = { ...createGame(25), phase: 'growth-result', origin: {} };
    localStorage.setItem('floating-life-cards.save.v4', JSON.stringify(missingGrowthResult));
    expect(loadGame()).toBeNull();

    const missingEnding = { ...createGame(26), phase: 'ending' };
    localStorage.setItem('floating-life-cards.save.v4', JSON.stringify(missingEnding));
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
