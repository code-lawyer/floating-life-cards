import { AgeRail } from '../components/AgeRail';
import { CardFace } from '../components/CardFace';
import { SceneArt } from '../components/SceneArt';
import { getAdultEvent } from '../game/game';
import { resourceDeltaLabel, resourceDeltaTone } from '../game/presentation';
import { getAdultEventSceneVisual } from '../game/visuals';
import type { Dispatch } from 'react';
import type { GameAction, GameState, ResourceKey } from '../game/types';

export function AdultResultScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const event = getAdultEvent(state)!;
  const visual = getAdultEventSceneVisual(event.id, event.age, event.title);
  const result = state.adultEventResult!;
  const upgradedCard = result.upgradedCardId ? state.cards.find((card) => card.id === result.upgradedCardId) : null;
  return (
    <main className="screen adult-result-screen">
      <AgeRail age={event.age} label="生活继续" />
      <section className="screen__body adult-result-layout">
        <SceneArt visual={visual} className="scene-art--result" />
        <div>
          <p className="eyebrow">选择已写入成年档案</p>
          <h1 className="display-title">你选择了：{result.choice}</h1>
          <p className="lead">{result.outcome}</p>
          <div className="resource-delta-row">
            {(Object.entries(result.changes) as Array<[ResourceKey, number]>).map(([key, value]) => (
              <span className={resourceDeltaTone(key, value)} key={key}>{resourceDeltaLabel(key, value)}</span>
            ))}
          </div>
          {result.mark && (
            <div className={`gained-mark gained-mark--${result.mark.tone}`}>
              <span>新的人生状态</span><b>{result.mark.title}</b><p>{result.mark.description}</p>
            </div>
          )}
          <button className="primary-button" onClick={() => dispatch({ type: 'CONTINUE_ADULT_EVENT' })}>继续往下生活</button>
        </div>
        {upgradedCard && (
          <div className="acquired-card">
            <p className="eyebrow">一段旧记忆被重新理解</p>
            <CardFace card={upgradedCard} upgraded experience={state.cardExperience[upgradedCard.id] ?? 0} />
          </div>
        )}
      </section>
    </main>
  );
}
