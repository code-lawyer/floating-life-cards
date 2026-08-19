import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { createGame, getGrowthEvent, reduceGame } from './game/game';
import { saveGame } from './game/persistence';
import { resourceDeltaLabel, resourceDeltaTone } from './game/presentation';
import type { GameState } from './game/types';

function makeDeckState(): GameState {
  let state = reduceGame(createGame(41), { type: 'BEGIN' });
  state = reduceGame(state, { type: 'ACCEPT_ORIGIN' });
  while (state.phase !== 'deck') {
    if (state.phase === 'growth') {
      state = reduceGame(state, { type: 'CHOOSE_GROWTH', choiceId: getGrowthEvent(state)!.choices[0]!.id });
    } else if (state.phase === 'growth-result') {
      state = reduceGame(state, { type: 'CONTINUE_GROWTH' });
    } else {
      throw new Error(`无法从 ${state.phase} 前进到组牌阶段`);
    }
  }
  return state;
}

describe('玩家入口', () => {
  it('从标题页进入普通人出生档案', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /浮生/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '登记出生' }));
    expect(screen.getByRole('heading', { name: '你只是一个普通人' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '收下这份出身' })).toBeEnabled();
  });

  it('标题页可打开包含核心术语的完整玩法说明', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '先读玩法说明' }));
    expect(screen.getByRole('dialog', { name: '怎样玩《浮生牌局》' })).toBeInTheDocument();
    expect(screen.getAllByText('牌力').length).toBeGreaterThan(0);
    expect(screen.getAllByText('守势').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: '克制与“同型”' })).toBeInTheDocument();
  });

  it('标题页可选择身份直接试玩公开规则的成年困局原型', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: '以名校毕业生开始原型' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '以职校技术员开始原型' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '以灵活就业者开始原型' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '以职校技术员开始原型' }));
    expect(screen.getByRole('heading', { name: '合同上没有写的事' })).toBeInTheDocument();
    expect(screen.getByText('职校技术员')).toBeInTheDocument();
    expect(screen.getByText('签字倒计时')).toBeInTheDocument();
    expect(screen.getByText(/从第二轮起，每过一轮/)).toBeInTheDocument();
  });

  it('设置先展示玩家叙事状态，再按需展开开发者接入', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '登记出生' }));
    const trigger = screen.getByRole('button', { name: '设置' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog', { name: '叙事方式' })).toHaveTextContent('无需联网');
    fireEvent.click(screen.getByText('开发者接入：连接 LLM 叙事裁判'));
    expect(screen.getByRole('dialog', { name: '叙事方式' })).toHaveTextContent('npm run judge');
    expect(screen.getByRole('button', { name: '测试端点' })).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '叙事方式' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('移动端菜单集中提供说明、叙事设置和重开入口', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '登记出生' }));
    fireEvent.click(screen.getByRole('button', { name: '菜单' }));
    const menu = screen.getByRole('dialog', { name: '浮生牌局' });
    expect(within(menu).getByRole('button', { name: /玩法说明/ })).toBeEnabled();
    expect(within(menu).getByRole('button', { name: /叙事设置/ })).toBeEnabled();
    expect(within(menu).getByRole('button', { name: /重开人生/ })).toBeEnabled();
    fireEvent.click(within(menu).getByRole('button', { name: /玩法说明/ }));
    expect(screen.getByRole('dialog', { name: '怎样玩《浮生牌局》' })).toBeInTheDocument();
  });

  it('成年组牌先给出八张随身牌摘要，并把完整规则收起', () => {
    saveGame(makeDeckState());
    render(<App />);
    expect(screen.getByRole('heading', { name: '带进成年的人生片段' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^移出/ })).toHaveLength(8);
    expect(screen.getByRole('button', { name: /已选/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('需要时再看：成年牌局的完整规则').closest('details')).not.toHaveAttribute('open');
  });

  it('第一场牌局通过行动逐步教学，而不是一次展示全部规则', () => {
    const encounter = reduceGame(makeDeckState(), { type: 'BEGIN_ADVENTURE' });
    saveGame(encounter);
    render(<App />);
    expect(screen.getByRole('heading', { name: '先看世界出了什么' })).toBeInTheDocument();
    expect(screen.queryByText('建议先出这张')).not.toBeInTheDocument();
    const handZone = screen.getByRole('region', { name: '这一次，你拿哪段自己来回答？' });
    const scrollIntoView = vi.fn();
    Object.defineProperty(handZone, 'scrollIntoView', { value: scrollIntoView });
    fireEvent.click(screen.getByRole('button', { name: '去看我的手牌' }));
    expect(screen.getByRole('heading', { name: '先打一张有把握的牌' })).toBeInTheDocument();
    expect(screen.getByText('建议先出这张')).toBeInTheDocument();
    expect(handZone).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    const playableCard = screen.getAllByRole('button', { name: /^唤起/ })[0]!;
    expect(playableCard).toHaveAccessibleName(/牌力 \d+，守势 \d+/);
    expect(playableCard).toHaveAccessibleDescription(/预计得分\s*\d+\s*对\s*\d+/);
  });

  it('减少动态效果时直接定位手牌而不执行平滑滚动', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    const encounter = reduceGame(makeDeckState(), { type: 'BEGIN_ADVENTURE' });
    saveGame(encounter);
    render(<App />);
    const handZone = screen.getByRole('region', { name: '这一次，你拿哪段自己来回答？' });
    const scrollIntoView = vi.fn();
    Object.defineProperty(handZone, 'scrollIntoView', { value: scrollIntoView });

    fireEvent.click(screen.getByRole('button', { name: '去看我的手牌' }));

    expect(handZone).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('刷新首轮结算页时恢复到教学结果步骤', () => {
    const deck = makeDeckState();
    deck.resources = { ...deck.resources, heart: 9 };
    let encounter = reduceGame(deck, { type: 'BEGIN_ADVENTURE' });
    encounter = reduceGame(encounter, { type: 'PLAY_CARD', cardId: encounter.encounter!.hand[0]! });
    saveGame(encounter);
    render(<App />);
    expect(screen.getByRole('heading', { name: '先看结果，再学下一条' })).toBeInTheDocument();
    expect(screen.queryByText('先看世界出了什么')).not.toBeInTheDocument();
    expect(screen.queryByText('人生档案')).not.toBeInTheDocument();
  });

  it('成年牌局可以用童年余温从回忆堆召回一张牌', () => {
    let encounter = reduceGame(makeDeckState(), { type: 'BEGIN_ADVENTURE' });
    encounter = { ...encounter, resources: { ...encounter.resources, heart: 9, pressure: 4 } };
    const cardId = encounter.encounter!.hand[0]!;
    const card = encounter.cards.find((item) => item.id === cardId)!;
    encounter = reduceGame(encounter, { type: 'PLAY_CARD', cardId });
    saveGame(encounter);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: `召回「${card.title}」` }));
    expect(screen.getByText('童年余温已用')).toBeInTheDocument();
    expect(screen.getByText(card.memory)).toBeInTheDocument();
    const originLabel = typeof card.originAge === 'number' ? `${card.originAge} 岁` : `${card.originAge}牌`;
    expect(within(screen.getByRole('region', { name: '童年余温' })).getByText(new RegExp(originLabel))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: `召回「${card.title}」` })).not.toBeInTheDocument();
  });

  it('灵活就业者的首次换手明确显示为免费', () => {
    const encounter = {
      ...reduceGame(makeDeckState(), { type: 'BEGIN_ADVENTURE' }),
      startingIdentity: 'gig-worker' as const,
    };
    saveGame(encounter);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '跳过教学' }));
    expect(screen.getByRole('button', { name: '换一手（免费）' })).toBeEnabled();
  });

  it('成年困局原型结果页可以用同一身份重新试玩', () => {
    const initial = reduceGame(createGame(1), { type: 'START_PROTOTYPE', identityId: 'gig-worker' });
    saveGame({
      ...initial,
      phase: 'encounter-result',
      encounter: { ...initial.encounter!, resolved: true, won: false },
    });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '用灵活就业者再试一次' }));
    expect(screen.getByRole('heading', { name: '合同上没有写的事' })).toBeInTheDocument();
    expect(screen.getByText('第 1 / 5 轮')).toBeInTheDocument();
    expect(screen.getByText('灵活就业者')).toBeInTheDocument();
  });

  it('压力变化按利害关系而不是数学正负着色', () => {
    expect(resourceDeltaTone('pressure', 1)).toBe('negative');
    expect(resourceDeltaTone('pressure', -1)).toBe('positive');
    expect(resourceDeltaLabel('pressure', 1)).toBe('压力上升 +1');
    expect(resourceDeltaLabel('pressure', -1)).toBe('压力缓解 -1');
  });
});
