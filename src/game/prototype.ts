import type { Chapter, LifeCard, StartingIdentityId } from './types';

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

export const PROTOTYPE_DECK_IDS = [
  'prototype-mistake-map',
  'prototype-radio-wire',
  'prototype-first-hand',
  'prototype-bike-chain',
  'prototype-confirm-key',
  'prototype-half-sentence',
  'prototype-table-talk',
  'prototype-leavable-home',
];

const PROTOTYPE_INTENTS: Chapter['intents'] = [
  { id: 'contract-family', title: '先谈前景', approach: '共情', power: 4, tell: '对方先说“我们是一家人”，始终没有打开合同。', text: '亲近的语言试图替具体条件占住位置。' },
  { id: 'contract-scope', title: '责任空白', approach: '洞察', power: 5, tell: '工作范围只写了“及其他安排”。', text: '没有边界的句子准备把所有例外变成日常。' },
  { id: 'contract-now', title: '当场签字', approach: '行动', power: 5, tell: '笔被推到你面前，下一位已经在门外等。', text: '仓促本身正在成为条件的一部分。' },
  { id: 'contract-everyone', title: '大家都签了', approach: '共情', power: 6, tell: '同伴的名字被当作同意条件的理由。', text: '群体的沉默被包装成你的答案。' },
  { id: 'contract-last-page', title: '最后一页', approach: '洞察', power: 6, tell: '真正影响收入与退出的条款藏在末页。', text: '最重要的数字终于离开了漂亮话。' },
];

const PROTOTYPE_NARRATIVE: Record<StartingIdentityId, Pick<Chapter, 'location' | 'premise' | 'victory' | 'setback'>> = {
  'elite-graduate': {
    location: '部门会议室 · 下午 16:40',
    premise: '入职流程的最后一页被推到你面前。招聘时谈过的培养、收入与退出条件，都没有被主动写清。',
    victory: '关键条件被逐条写清。你签下的不是一条被学历保证的路，而是一份自己知道将承担什么的约定。',
    setback: '会议结束时仍有空白。你第一次发现，擅长回答问题并不等于别人会主动说明代价。',
  },
  'technical-worker': {
    location: '站点办公室 · 下午 16:40',
    premise: '班次确认前，一份写着“服从其他安排”的合同被递过来。工种、加班与安全责任仍停在口头说法里。',
    victory: '班次、工种与责任被逐条写清。手上的技术没有替你谈判，却让你知道哪些承诺必须落到纸面。',
    setback: '办公室准备关门时仍有几处空白。你记下它们，知道熟练工作不等于必须接受模糊边界。',
  },
  'gig-worker': {
    location: '平台服务中心 · 下午 16:40',
    premise: '账号开通前，平台协议要求立即确认。抽成、派单、申诉与退出规则散落在没有人主动解释的页面里。',
    victory: '抽成、派单与退出条件终于被逐条确认。灵活不是没有边界，而是知道自己正在交换什么。',
    setback: '确认倒计时结束时仍有问题没被回答。你没有得到完整保障，但已经认出哪些风险不能只靠“自由”二字带过。',
  },
};

export function getPrototypeChapter(identityId: StartingIdentityId): Chapter {
  return {
    id: 'contract-terms',
    year: 24,
    title: '合同上没有写的事',
    target: 12,
    rounds: 5,
    rule: {
      id: 'signature-countdown',
      title: '签字倒计时',
      description: '从第二轮起，每过一轮，世界强度 +1。拖得越久，对方越把时间变成你的压力。',
      effect: { kind: 'escalating-world', amount: 1 },
    },
    intents: PROTOTYPE_INTENTS,
    ...PROTOTYPE_NARRATIVE[identityId],
  };
}
