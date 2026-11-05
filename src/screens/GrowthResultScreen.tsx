import { AgeRail } from '../components/AgeRail';
import { CardFace } from '../components/CardFace';
import { SceneArt } from '../components/SceneArt';
import { getGrowthEvent } from '../game/game';
import { resourceDeltaLabel, resourceDeltaTone } from '../game/presentation';
import { getGrowthSceneVisual } from '../game/visuals';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../game/types';

export function GrowthResultScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const result = state.growthResult!;
  const event = getGrowthEvent(state)!;
  const visual = getGrowthSceneVisual(event.artAge ?? event.age, event.title);
  const resourceDelta = result.cost.resource === 'pressure' ? result.cost.amount : -result.cost.amount;
  const isGain = resourceDeltaTone(result.cost.resource, resourceDelta) === 'positive';
  return (
    <main className="screen result-screen">
      <AgeRail age={result.age} label="已归档" />
      <section className="screen__body result-layout">
        <SceneArt visual={visual} className="scene-art--result" />
        <div>
          <p className="eyebrow">选择已发生 · 无法撤回</p>
          <h1 className="display-title">你选择了：{result.choice}</h1>
          <p className="lead">{result.text}</p>
          <div className={`cost-stamp ${isGain ? 'cost-stamp--gain' : ''}`}>
            <span>{isGain ? '意外所得' : '随机代价'}</span>
            <b>{resourceDeltaLabel(result.cost.resource, resourceDelta)}</b>
          </div>
          <button className="primary-button" onClick={() => dispatch({ type: 'CONTINUE_GROWTH' })}>
            {result.age === 17 ? '带着这些牌成年' : `继续到 ${result.age + 1} 岁`}
          </button>
        </div>
        <div className="acquired-card">
          <p className="eyebrow">新记忆入手</p>
          <CardFace card={result.card} />
        </div>
      </section>
    </main>
  );
}
