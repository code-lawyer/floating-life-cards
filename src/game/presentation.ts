import type { Approach, ResourceKey } from './types';

export const RESOURCE_META: Record<ResourceKey, { label: string; sign: string; inverse?: boolean }> = {
  heart: { label: '心气', sign: '心' },
  money: { label: '余钱', sign: '钱' },
  bonds: { label: '人情', sign: '人' },
  pressure: { label: '压力', sign: '压', inverse: true },
};

export const APPROACH_CLASS: Record<Approach, string> = {
  洞察: 'insight',
  行动: 'action',
  共情: 'empathy',
};

export const APPROACH_NOTE: Record<Approach, string> = {
  洞察: '看清局势，再找到缝隙',
  行动: '先迈出去，让局面改变',
  共情: '理解他人，也让彼此靠近',
};

export function resourceDeltaTone(key: ResourceKey, value: number): 'positive' | 'negative' {
  const helpful = key === 'pressure' ? value < 0 : value > 0;
  return helpful ? 'positive' : 'negative';
}

export function resourceDeltaLabel(key: ResourceKey, value: number): string {
  if (key === 'pressure') return value > 0 ? `压力上升 +${value}` : `压力缓解 ${value}`;
  return `${RESOURCE_META[key].label} ${value > 0 ? '增加 +' : '减少 '}${value}`;
}
