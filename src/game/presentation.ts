import type { ResourceKey } from './types';

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  heart: '心气',
  money: '余钱',
  bonds: '人情',
  pressure: '压力',
};

export function resourceDeltaTone(key: ResourceKey, value: number): 'positive' | 'negative' {
  const helpful = key === 'pressure' ? value < 0 : value > 0;
  return helpful ? 'positive' : 'negative';
}

export function resourceDeltaLabel(key: ResourceKey, value: number): string {
  if (key === 'pressure') return value > 0 ? `压力上升 +${value}` : `压力缓解 ${value}`;
  return `${RESOURCE_LABELS[key]} ${value > 0 ? '增加 +' : '减少 '}${value}`;
}
