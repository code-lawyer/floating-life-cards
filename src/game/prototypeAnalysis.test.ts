import { describe, expect, it } from 'vitest';
import { analyzePrototype } from './prototypeAnalysis';

describe('成人原型决策空间分析', () => {
  it('从固定开局枚举四张可唤起记忆和一次换手机会', () => {
    const report = analyzePrototype('technical-worker');

    expect(report.identityId).toBe('technical-worker');
    expect(report.openingOptions.map((option) => ({ kind: option.kind, id: option.id, label: option.label }))).toEqual([
      { kind: 'play', id: 'prototype-table-talk', label: '餐桌上的谈判' },
      { kind: 'play', id: 'prototype-bike-chain', label: '自己修好的车链' },
      { kind: 'play', id: 'prototype-mistake-map', label: '错题地图' },
      { kind: 'play', id: 'prototype-half-sentence', label: '给同桌留的半句话' },
      { kind: 'redraw', id: 'redraw', label: '换一手' },
    ]);
    expect(report.statesExplored).toBeGreaterThan(report.openingOptions.length);
  });

  it('三个身份的每个固定开局都有可胜路线，余温既能参与胜利也不是强制钥匙', () => {
    for (const identityId of ['elite-graduate', 'technical-worker', 'gig-worker'] as const) {
      const report = analyzePrototype(identityId);

      expect(report.outcome.canWin, identityId).toBe(true);
      expect(report.openingOptions.every((option) => option.outcome.canWin), identityId).toBe(true);
      expect(report.outcome.canLose, identityId).toBe(true);
      expect(report.openingOptions.every((option) => option.outcome.canLose), identityId).toBe(true);
      expect(report.outcome.canExhaustHeart, identityId).toBe(false);
      expect(report.outcome.winWithWarmth, identityId).toBe(true);
      expect(report.outcome.winWithoutWarmth, identityId).toBe(true);
      expect(report.outcome.winWithRedraw, identityId).toBe(true);
      expect(report.outcome.winWithoutRedraw, identityId).toBe(true);
      expect(report.outcome.shortestWinRounds, identityId).toBeGreaterThanOrEqual(2);
      expect(report.outcome.shortestWinRounds, identityId).toBeLessThanOrEqual(5);
    }
  });
});
