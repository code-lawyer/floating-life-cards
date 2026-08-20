import type { LifeCard, MemoryTag, Resources, StartingIdentity, StartingIdentityId, Traits } from './types';

export const STARTING_IDENTITIES: StartingIdentity[] = [
  {
    id: 'elite-graduate',
    title: '名校毕业生',
    description: '较早学会辨认制度、资格与评价体系，也背负着更高的外界期待。',
    passiveText: '每场首轮打出洞察牌时，牌力 +1。',
    passive: { kind: 'first-round-approach', approach: '洞察', amount: 1 },
  },
  {
    id: 'technical-worker',
    title: '职校技术员',
    description: '相信具体问题可以靠训练、手感与可靠的工序解决。',
    passiveText: '带有“手艺”标签的记忆牌，牌力 +1。',
    passive: { kind: 'card-tag', tag: '手艺', amount: 1 },
  },
  {
    id: 'gig-worker',
    title: '灵活就业者',
    description: '从事外卖、快递、网约车等平台或弹性排班工作，熟悉在变化中临场调整。',
    passiveText: '每场第一次换手不增加压力。',
    passive: { kind: 'free-first-redraw' },
  },
];

export function getStartingIdentity(id: StartingIdentityId | null | undefined): StartingIdentity | null {
  return STARTING_IDENTITIES.find((identity) => identity.id === id) ?? null;
}

const TAG_SIGNALS: Record<MemoryTag, string[]> = {
  学习: ['学习', '方法', '判断', '媒介', '未来', '计划', '观察', '耐心'],
  手艺: ['手艺', '技术', '制作', '修理', '工作', '金钱'],
  关系: ['关系', '友谊', '家庭', '陪伴', '合作', '沟通', '倾听', '包容', '纪念', '告别'],
  担当: ['担当', '责任', '领导', '诚实', '正义', '边界', '组织', '规则'],
  探索: ['探索', '远方', '冒险', '勇气', '独立', '舞台', '好奇'],
};

export interface StartingIdentityProfile {
  id: StartingIdentityId;
  tagCounts: Record<MemoryTag, number>;
  scores: Record<StartingIdentityId, number>;
  reasons: [string, string, string];
}

export function getMemoryTags(card: LifeCard): MemoryTag[] {
  return (Object.entries(TAG_SIGNALS) as Array<[MemoryTag, string[]]>)
    .filter(([, signals]) => signals.some((signal) => card.tags.includes(signal)))
    .map(([tag]) => tag);
}

export function deriveStartingIdentity(cards: LifeCard[], traits: Traits, resources: Resources): StartingIdentityProfile {
  const tagCounts: Record<MemoryTag, number> = { 学习: 0, 手艺: 0, 关系: 0, 担当: 0, 探索: 0 };
  for (const card of cards) {
    for (const tag of getMemoryTags(card)) tagCounts[tag] += 1;
  }
  const scores: Record<StartingIdentityId, number> = {
    'elite-graduate': tagCounts.学习 * 4 + traits.insight,
    // 正式童年中手艺事件稀少但信号明确：两次持续的实践选择应足以形成技术路径。
    'technical-worker': tagCounts.手艺 * 12 + tagCounts.担当 + traits.nerve * 2,
    'gig-worker': tagCounts.探索 * 4 + tagCounts.担当 * 2 + Math.max(traits.nerve, traits.empathy),
  };
  const id = (Object.entries(scores) as Array<[StartingIdentityId, number]>)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]![0];
  const dominantTrait = (Object.entries(traits) as Array<[keyof Traits, number]>)
    .sort((left, right) => right[1] - left[1])[0]!;
  const traitName: Record<keyof Traits, string> = { insight: '洞察', nerve: '行动', empathy: '共情' };
  const identitySignal: Record<StartingIdentityId, MemoryTag[]> = {
    'elite-graduate': ['学习', '探索'],
    'technical-worker': ['手艺', '担当'],
    'gig-worker': ['探索', '担当'],
  };
  const [firstTag, secondTag] = identitySignal[id];
  const resourceReason = resources.money >= 5
    ? `童年结束时仍保留 ${resources.money} 点余钱，让时间跳切有一段现实缓冲`
    : `童年结束时只有 ${resources.money} 点余钱，成年起点更强调立即适应现实`;
  return {
    id,
    tagCounts,
    scores,
    reasons: [
      `${firstTag}类记忆累计 ${tagCounts[firstTag]} 张，成为最重要的身份线索之一`,
      `${secondTag}类记忆累计 ${tagCounts[secondTag]} 张，与前一条线索共同形成路径`,
      `${traitName[dominantTrait[0]]}成长倾向达到 ${dominantTrait[1]}；${resourceReason}`,
    ],
  };
}

export function getIdentityCardBonus(
  id: StartingIdentityId | null | undefined,
  card: LifeCard,
  round: number,
): number {
  const passive = getStartingIdentity(id)?.passive;
  if (!passive || passive.kind === 'free-first-redraw') return 0;
  if (passive.kind === 'first-round-approach') {
    return round === 1 && card.approach === passive.approach ? passive.amount : 0;
  }
  return getMemoryTags(card).includes(passive.tag) ? passive.amount : 0;
}

export function identityMakesFirstRedrawFree(id: StartingIdentityId | null | undefined): boolean {
  return getStartingIdentity(id)?.passive.kind === 'free-first-redraw';
}
