import type { LifeCard } from './types';

export const PROTOTYPE_SEED = 0x24c0ffee;

export const PROTOTYPE_CARDS: LifeCard[] = [
  {
    id: 'prototype-mistake-map', title: '错题地图', approach: '洞察', power: 4, guard: 2, originAge: 7,
    memory: '你把错误逐行订正，第一次发现失败也可以成为下一步的地图。',
    effect: { kind: 'draw', description: '胜出时，多看一张牌。' }, tags: ['学习'],
  },
  {
    id: 'prototype-radio-wire', title: '收音机里的断线', approach: '洞察', power: 4, guard: 2, originAge: 10,
    memory: '你沿着线路找到那根松开的线，噪声终于重新变成了人声。',
    effect: { kind: 'steady', description: '压力不低于 4 时，牌力 +2。' }, tags: ['手艺', '学习'],
  },
  {
    id: 'prototype-circled-line', title: '被圈出的那一行', approach: '洞察', power: 5, guard: 1, originAge: 15,
    memory: '你没有被整页漂亮话带走，只问清了真正会改变结果的那一行。',
    effect: { kind: 'draw', description: '胜出时，多看一张牌。' }, tags: ['担当', '学习'],
  },
  {
    id: 'prototype-first-hand', title: '第一次举手', approach: '行动', power: 4, guard: 2, originAge: 6,
    memory: '你其实只记得第一句，但举起手以后，后面的台词一句句跟了上来。',
    effect: { kind: 'resource', resource: 'heart', amount: 1, description: '胜出时，心气 +1。' }, tags: ['探索', '担当'],
  },
  {
    id: 'prototype-bike-chain', title: '自己修好的车链', approach: '行动', power: 4, guard: 2, originAge: 12,
    memory: '油污沾满手指时，你终于让掉下来的链条重新咬住齿轮。',
    effect: { kind: 'resource', resource: 'heart', amount: 1, description: '胜出时，心气 +1。' }, tags: ['手艺', '担当'],
  },
  {
    id: 'prototype-confirm-key', title: '倒计时外的确认键', approach: '行动', power: 5, guard: 1, originAge: 17,
    memory: '十一分钟结束以前，你按下确认，把犹豫留在倒计时外。',
    effect: { kind: 'echo', description: '若上一轮失手，牌力 +2。' }, tags: ['探索'],
  },
  {
    id: 'prototype-half-sentence', title: '给同桌留的半句话', approach: '共情', power: 4, guard: 2, originAge: 8,
    memory: '你没有替朋友说出秘密，只替他挡住了那些来不及回答的追问。',
    effect: { kind: 'resource', resource: 'bonds', amount: 1, description: '胜出时，人情 +1。' }, tags: ['关系'],
  },
  {
    id: 'prototype-table-talk', title: '餐桌上的谈判', approach: '共情', power: 4, guard: 2, originAge: 14,
    memory: '你第一次把留下与离开的理由都放上餐桌，没有把牵挂变成命令。',
    effect: { kind: 'resource', resource: 'pressure', amount: -1, description: '出牌后，压力 -1。' }, tags: ['关系', '担当'],
  },
  {
    id: 'prototype-bookcase', title: '一起抬过的旧书柜', approach: '共情', power: 4, guard: 3, originAge: 11,
    memory: '拐角太窄时，所有人一起换了握法，沉重的东西才终于通过。',
    effect: { kind: 'resource', resource: 'bonds', amount: 1, description: '胜出时，人情 +1。' }, tags: ['手艺', '关系'],
  },
  {
    id: 'prototype-leavable-home', title: '可以离开的家', approach: '共情', power: 3, guard: 3, originAge: 17,
    memory: '家人没有替你决定远近，只告诉你：能回来，不等于必须留下。',
    effect: { kind: 'resource', resource: 'pressure', amount: -1, description: '出牌后，压力 -1。' }, tags: ['关系', '探索'],
  },
];

export const PROTOTYPE_DECK_IDS = PROTOTYPE_CARDS
  .filter((card) => card.id !== 'prototype-circled-line' && card.id !== 'prototype-bookcase')
  .map((card) => card.id);
