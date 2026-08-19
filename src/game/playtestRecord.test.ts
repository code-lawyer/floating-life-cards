import { describe, expect, it } from 'vitest';
import { createGame, reduceGame } from './game';
import { formatPrototypePlaytestRecord } from './playtestRecord';

function makeResolvedPrototype() {
  const started = reduceGame(createGame(20260819), {
    type: 'START_PROTOTYPE',
    identityId: 'gig-worker',
  });
  return {
    ...started,
    phase: 'encounter-result' as const,
    resources: { heart: 7, money: 5, bonds: 5, pressure: 3 },
    encounter: {
      ...started.encounter!,
      progress: 13,
      round: 3,
      redrawUsed: true,
      warmthUsed: true,
      warmthCardId: 'prototype-table-talk',
      resolved: true,
      won: true,
      records: [
        {
          cardTitle: '餐桌上的谈判',
          intentTitle: '先说清楚这不是裁员',
          playerScore: 7,
          worldScore: 4,
          outcome: 'win' as const,
          text: '你先问清了合同里没有写的部分。',
        },
        {
          cardTitle: '给同桌留的半句话',
          intentTitle: '只给十分钟考虑',
          playerScore: 5,
          worldScore: 5,
          outcome: 'draw' as const,
          text: '你没有立刻回答。',
        },
        {
          cardTitle: '自己修好的车链',
          intentTitle: '当场签字',
          playerScore: 8,
          worldScore: 6,
          outcome: 'win' as const,
          text: '你把笔放回桌面。',
        },
      ],
    },
  };
}

describe('成人原型试玩客观记录', () => {
  it('把已结案原型整理为不含个人信息的可复制 Markdown', () => {
    expect(formatPrototypePlaytestRecord(makeResolvedPrototype())).toBe(`# 《浮生牌局》成年困局试玩客观记录

> 由本机结案状态生成，不联网，不包含试玩者姓名、联系方式或访谈回答。

- 试玩身份：灵活就业者
- 身份被动：每场第一次换手不增加压力。
- 原型种子：616628206
- 结果：越过局面
- 推进：13 / 12
- 回合：3 / 5
- 终局资源：心气 7、余钱 5、人情 5、压力 3
- 换手：已使用
- 童年余温：已使用，召回「餐桌上的谈判」

## 逐轮事实

| 轮次 | 世界意图 | 唤起记忆 | 分数 | 结果 |
| ---: | --- | --- | ---: | --- |
| 1 | 先说清楚这不是裁员 | 餐桌上的谈判 | 7 : 4 | 推进 |
| 2 | 只给十分钟考虑 | 给同桌留的半句话 | 5 : 5 | 僵持 |
| 3 | 当场签字 | 自己修好的车链 | 8 : 6 | 推进 |

## 观察者补记

- 玩家第一次出牌前怎样解释目标和规则：
- 每轮选择理由与曾考虑的另一张牌：
- 第一次真正犹豫的位置：
- 童年余温带来的感受：
- 身份是否改变打法或造成刻板印象：
- 是否愿意立即重试或继续下一场：
`);
  });

  it('不为未结案或正式故事生成原型试玩记录', () => {
    const activePrototype = reduceGame(createGame(1), {
      type: 'START_PROTOTYPE',
      identityId: 'elite-graduate',
    });
    expect(formatPrototypePlaytestRecord(activePrototype)).toBeNull();
    expect(formatPrototypePlaytestRecord(createGame(1))).toBeNull();
  });
});
