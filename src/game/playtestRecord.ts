import { getStartingIdentity } from './identities';
import { getPrototypeChapter } from './prototype';
import type { GameState } from './types';

const OUTCOME_LABEL = {
  win: '推进',
  draw: '僵持',
  loss: '受挫',
} as const;

export function formatPrototypePlaytestRecord(state: GameState): string | null {
  if (state.mode !== 'prototype' || state.phase !== 'encounter-result' || !state.encounter?.resolved) return null;
  const identity = getStartingIdentity(state.startingIdentity);
  if (!identity) return null;
  const chapter = getPrototypeChapter(identity.id);
  const recalledCard = state.cards.find((card) => card.id === state.encounter!.warmthCardId);
  const rounds = state.encounter.records.map((record, index) => (
    `| ${index + 1} | ${record.intentTitle} | ${record.cardTitle} | ${record.playerScore} : ${record.worldScore} | ${OUTCOME_LABEL[record.outcome]} |`
  ));
  const warmth = state.encounter.warmthUsed
    ? `已使用${recalledCard ? `，召回「${recalledCard.title}」` : ''}`
    : '未使用';

  return `# 《浮生牌局》成年困局试玩客观记录

> 由本机结案状态生成，不联网，不包含试玩者姓名、联系方式或访谈回答。

- 试玩身份：${identity.title}
- 身份被动：${identity.passiveText}
- 原型种子：${state.seed}
- 结果：${state.encounter.won ? '越过局面' : '局面未解'}
- 推进：${state.encounter.progress} / ${chapter.target}
- 回合：${state.encounter.records.length} / ${chapter.rounds}
- 终局资源：心气 ${state.resources.heart}、余钱 ${state.resources.money}、人情 ${state.resources.bonds}、压力 ${state.resources.pressure}
- 换手：${state.encounter.redrawUsed ? '已使用' : '未使用'}
- 童年余温：${warmth}

## 逐轮事实

| 轮次 | 世界意图 | 唤起记忆 | 分数 | 结果 |
| ---: | --- | --- | ---: | --- |
${rounds.join('\n')}

## 观察者补记

- 玩家第一次出牌前怎样解释目标和规则：
- 每轮选择理由与曾考虑的另一张牌：
- 第一次真正犹豫的位置：
- 童年余温带来的感受：
- 身份是否改变打法或造成刻板印象：
- 是否愿意立即重试或继续下一场：
`;
}
