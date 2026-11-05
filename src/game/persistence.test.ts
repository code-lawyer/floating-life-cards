import { describe, expect, it, vi } from 'vitest';
import packageInfo from '../../package.json';
import { makeStoryStates } from '../test/storyFixture';
import { createGame, reduceGame } from './game';
import { clearSave, loadGame, saveGame } from './persistence';
import type { GameState, Phase } from './types';

const STORY_KEY = 'floating-life-cards.save.v7';
const LEGACY_KEY = 'floating-life-cards.save.v4';
const PROTOTYPE_KEY = 'floating-life-cards.prototype.v7';
const storyStates = makeStoryStates();
const at = (phase: Phase) => storyStates.find((state) => state.phase === phase)!;
const legacyEncounter = makeStoryStates('classic').find((state) => state.phase === 'encounter')!;

type Corruption = { name: string; phase: Phase; corrupt: (state: GameState) => unknown };
const corruptions: Corruption[] = [
  { name: '非法阶段', phase: 'title', corrupt: (s) => ({ ...s, phase: 'white-screen' }) },
  { name: '缺少资源', phase: 'title', corrupt: (s) => ({ ...s, resources: undefined }) },
  { name: '资源低于零', phase: 'encounter', corrupt: (s) => ({ ...s, resources: { ...s.resources, heart: -1 } }) },
  { name: '资源高于上限', phase: 'encounter', corrupt: (s) => ({ ...s, resources: { ...s.resources, money: 10 } }) },
  { name: '负数成长倾向', phase: 'identity', corrupt: (s) => ({ ...s, traits: { ...s.traits, nerve: -1 } }) },
  { name: '没有对应成长事件的年龄', phase: 'growth', corrupt: (s) => ({ ...s, age: 18 }) },
  { name: '空出身对象', phase: 'origin', corrupt: (s) => ({ ...s, origin: {} }) },
  { name: '缺少成长结果', phase: 'growth-result', corrupt: (s) => ({ ...s, growthResult: null }) },
  { name: '空成长结果', phase: 'growth-result', corrupt: (s) => ({ ...s, growthResult: {} }) },
  { name: '非法成长代价', phase: 'growth-result', corrupt: (s) => ({ ...s, growthResult: { ...s.growthResult, cost: { resource: 'unknown', amount: 1, text: '' } } }) },
  { name: '缺少身份', phase: 'identity', corrupt: (s) => ({ ...s, startingIdentity: null }) },
  { name: '未知身份', phase: 'identity', corrupt: (s) => ({ ...s, startingIdentity: 'unknown-job' }) },
  { name: '不足八张随身牌', phase: 'identity', corrupt: (s) => ({ ...s, selectedDeck: s.selectedDeck.slice(1) }) },
  { name: '重复随身牌', phase: 'identity', corrupt: (s) => ({ ...s, selectedDeck: s.selectedDeck.map(() => s.selectedDeck[0]) }) },
  { name: '缺少牌局', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: null }) },
  { name: '牌局提前标成已结算', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, resolved: true } }) },
  { name: '结案仍标成未结算', phase: 'encounter-result', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, resolved: false } }) },
  { name: '不存在的章节', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, chapterIndex: 99 } }) },
  { name: '负数轮次', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, round: -1 } }) },
  { name: '超出章节的轮次', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, round: 99 } }) },
  { name: '空世界意图', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, currentIntent: {} } }) },
  { name: '空时代气候', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, climate: {} } }) },
  { name: '空回合记录', phase: 'encounter-result', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, records: [null] } }) },
  { name: '轮次与记录不符', phase: 'encounter-result', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, records: [] } }) },
  { name: '全部牌堆被清空', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, hand: [], drawPile: [], memoryPile: [] } }) },
  { name: '手牌为空无法出牌', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, hand: [], drawPile: [...s.encounter!.drawPile, ...s.encounter!.hand] } }) },
  { name: '牌堆重复卡牌', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, memoryPile: [s.encounter!.hand[0]] } }) },
  { name: '牌堆混入未选牌', phase: 'encounter', corrupt: (s) => ({ ...s, encounter: { ...s.encounter, hand: [s.cards.find((c) => !s.selectedDeck.includes(c.id))!.id, ...s.encounter!.hand.slice(1)] } }) },
  { name: 'null 人生状态', phase: 'encounter', corrupt: (s) => ({ ...s, marks: [null] }) },
  { name: '不完整人生状态效果', phase: 'encounter', corrupt: (s) => ({ ...s, marks: [{ id: 'x', title: 'x', description: '', tone: 'good', effect: {} }] }) },
  { name: 'null 日志', phase: 'origin', corrupt: (s) => ({ ...s, journal: [null] }) },
  { name: '卡牌缺少资源效果字段', phase: 'identity', corrupt: (s) => ({ ...s, cards: s.cards.map((c, i) => i ? c : { ...c, effect: { kind: 'resource', description: '' } }) }) },
  { name: '非法熟练度', phase: 'encounter', corrupt: (s) => ({ ...s, cardExperience: { [s.selectedDeck[0]!]: 'bad' } }) },
  { name: '升级牌引用不存在', phase: 'encounter', corrupt: (s) => ({ ...s, upgradedCards: ['missing'] }) },
  { name: 'null 成年排程', phase: 'encounter', corrupt: (s) => ({ ...s, adultSchedule: [null] }) },
  { name: '未知成年事件', phase: 'adult-event', corrupt: (s) => ({ ...s, activeAdultEventId: 'missing' }) },
  { name: '缺少成年结果', phase: 'adult-result', corrupt: (s) => ({ ...s, adultEventResult: null }) },
  { name: '成年结果资源名错误', phase: 'adult-result', corrupt: (s) => ({ ...s, adultEventResult: { ...s.adultEventResult, changes: { typo: 1 } } }) },
  { name: '空结局对象', phase: 'ending', corrupt: (s) => ({ ...s, ending: {} }) },
];

describe('本地存档', () => {
  it('组牌增减、阶段确认和存档恢复使用同一个容量边界', () => {
    const full = at('deck');
    const selected = full.selectedDeck[0]!;
    const outside = full.cards.find((card) => !full.selectedDeck.includes(card.id))!.id;
    expect(reduceGame(full, { type: 'TOGGLE_DECK', cardId: outside })).toBe(full);
    const short = reduceGame(full, { type: 'TOGGLE_DECK', cardId: selected });
    expect(reduceGame(short, { type: 'CONFIRM_DECK' })).toBe(short);
    saveGame(short);
    expect(loadGame()).toEqual(short);
    const replaced = reduceGame(short, { type: 'TOGGLE_DECK', cardId: outside });
    expect(replaced.selectedDeck).toHaveLength(full.selectedDeck.length);
    const confirmed = reduceGame(replaced, { type: 'CONFIRM_DECK' });
    expect(confirmed.phase).toBe('identity');
    saveGame(confirmed);
    expect(loadGame()).toEqual(confirmed);
    localStorage.setItem(STORY_KEY, JSON.stringify({ ...confirmed, selectedDeck: [...confirmed.selectedDeck, selected] }));
    expect(loadGame()).toBeNull();
  });

  it.each(['QuotaExceededError', 'SecurityError'])('v4迁移遇到%s仍恢复可读进度并可继续出牌', (errorName) => {
    const state = legacyEncounter;
    const legacy = JSON.stringify({ ...state, version: 4, startingIdentity: null });
    localStorage.setItem(LEGACY_KEY, legacy);
    expect(loadGame()).toEqual(state);
    localStorage.removeItem(STORY_KEY);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('write unavailable', errorName);
    });
    try {
      const restored = loadGame();
      expect(restored).toEqual(state);
      const continued = reduceGame(restored!, { type: 'PLAY_CARD', cardId: state.encounter!.hand[0]! });
      expect(continued.encounter?.records).toHaveLength(1);
      expect(localStorage.getItem(LEGACY_KEY)).toBe(legacy);
      expect(localStorage.getItem(STORY_KEY)).toBeNull();
    } finally {
      write.mockRestore();
    }
  });

  it('完整故事的每个保存时点都能无损恢复', () => {
    expect(new Set(storyStates.map((s) => s.phase)).size).toBe(12);
    for (const state of storyStates) {
      saveGame(state);
      expect(loadGame(), `${state.phase}/${state.encounter?.round}`).toEqual(state);
    }
    clearSave();
    expect(loadGame()).toBeNull();
  });

  it.each(corruptions)('拒绝 $name，且正常对照存档可以恢复', ({ phase, corrupt }) => {
    const state = at(phase);
    saveGame(state);
    expect(loadGame()).toEqual(state);
    localStorage.setItem(STORY_KEY, JSON.stringify(corrupt(state)));
    expect(loadGame()).toBeNull();
  });

  it('正式故事与当前构建的成年原型使用独立槽位，原型每轮都可以恢复', () => {
    const story = at('growth');
    saveGame(story);
    let prototype = reduceGame(createGame(12), { type: 'START_PROTOTYPE', identityId: 'technical-worker' });
    saveGame(prototype);
    expect(loadGame('prototype')).toEqual(prototype);
    prototype = reduceGame(prototype, { type: 'REDRAW_HAND' });
    saveGame(prototype);
    expect(loadGame('prototype')).toEqual(prototype);
    while (prototype.phase === 'encounter') {
      prototype = reduceGame(prototype, { type: 'PLAY_CARD', cardId: prototype.encounter!.hand[0]! });
      if (prototype.phase === 'encounter' && !prototype.encounter!.warmthUsed) {
        prototype = reduceGame(prototype, { type: 'RECALL_MEMORY', cardId: prototype.encounter!.memoryPile[0]! });
      }
      saveGame(prototype);
      expect(loadGame('prototype')).toEqual(prototype);
    }
    clearSave('prototype');
    expect(loadGame('prototype')).toBeNull();
    expect(loadGame()).toEqual(story);
  });

  it('损坏原型同样经过结构校验，旧构建与无封装原型不会混入当前构建', () => {
    const state = reduceGame(createGame(12), { type: 'START_PROTOTYPE', identityId: 'gig-worker' });
    saveGame(state);
    expect(loadGame('prototype')).toEqual(state);
    for (const payload of [
      { buildVersion: packageInfo.version, state: { ...state, marks: [null] } },
      { buildVersion: '0.0.0', state },
      state,
    ]) {
      localStorage.setItem(PROTOTYPE_KEY, JSON.stringify(payload));
      expect(loadGame('prototype')).toBeNull();
    }
  });

  it('忽略损坏 JSON 与未知版本', () => {
    for (const payload of ['{broken', JSON.stringify({ ...createGame(9), version: 3 })]) {
      localStorage.setItem(STORY_KEY, payload);
      expect(loadGame()).toBeNull();
    }
  });

  it('真正的 v4 成年故事可迁移并补齐身份，其他内容保持不变', () => {
    const state = legacyEncounter;
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ ...state, version: 4, startingIdentity: null }));
    expect(loadGame()).toEqual(state);
    expect(JSON.parse(localStorage.getItem(STORY_KEY)!)).toEqual(state);
    clearSave();
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('旧版迁移同样拒绝损坏结构，不把版本拒绝误当结构覆盖', () => {
    const state = legacyEncounter;
    const legacy = { ...state, version: 4, startingIdentity: null };
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
    expect(loadGame()).toEqual(state);
    localStorage.removeItem(STORY_KEY);
    localStorage.setItem(LEGACY_KEY, JSON.stringify({ ...legacy, marks: [null] }));
    expect(loadGame()).toBeNull();
  });
});
