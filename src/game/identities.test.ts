import { describe, expect, it } from 'vitest';
import { deriveStartingIdentity, getIdentityCardBonus, getMemoryTags } from './identities';
import type { LifeCard } from './types';

function card(id: string, tags: string[], approach: LifeCard['approach'] = '洞察'): LifeCard {
  return {
    id,
    title: id,
    approach,
    power: 4,
    guard: 2,
    originAge: 10,
    memory: `${id} 的记忆`,
    effect: { kind: 'steady', description: '测试' },
    tags,
  };
}

const resources = { heart: 7, money: 5, bonds: 5, pressure: 1 };

describe('童年生成起手身份', () => {
  it('学习线索集中时生成名校毕业生并给出三个原因', () => {
    const cards = [card('a', ['学习']), card('b', ['判断']), card('c', ['未来'])];
    const profile = deriveStartingIdentity(cards, { insight: 7, nerve: 3, empathy: 4 }, resources);

    expect(profile.id).toBe('elite-graduate');
    expect(profile.reasons).toHaveLength(3);
  });

  it('手艺线索集中时生成职校技术员，技术牌能触发被动', () => {
    const technicalCard = card('radio', ['技术'], '行动');
    const cards = [technicalCard, card('work', ['工作'], '行动'), card('repair', ['修理'], '洞察')];
    const profile = deriveStartingIdentity(cards, { insight: 3, nerve: 7, empathy: 3 }, resources);

    expect(profile.id).toBe('technical-worker');
    expect(getMemoryTags(technicalCard)).toContain('手艺');
    expect(getIdentityCardBonus(profile.id, technicalCard, 2)).toBe(1);
  });

  it('探索与担当线索集中时生成灵活就业者', () => {
    const cards = [card('far', ['远方'], '行动'), card('brave', ['勇气'], '行动'), card('duty', ['担当'], '共情')];
    const profile = deriveStartingIdentity(cards, { insight: 3, nerve: 7, empathy: 5 }, { ...resources, money: 2 });

    expect(profile.id).toBe('gig-worker');
    expect(profile.reasons[2]).toContain('2 点余钱');
  });
});
