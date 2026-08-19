import type { LifeCard, StartingIdentity, StartingIdentityId } from './types';

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
  return card.tags.includes(passive.tag) ? passive.amount : 0;
}

export function identityMakesFirstRedrawFree(id: StartingIdentityId | null | undefined): boolean {
  return getStartingIdentity(id)?.passive.kind === 'free-first-redraw';
}
