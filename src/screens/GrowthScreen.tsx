import { AgeRail } from '../components/AgeRail';
import { ApproachMark } from '../components/ApproachMark';
import { SceneArt } from '../components/SceneArt';
import { MemoryEchoPanel } from '../components/MemoryEchoPanel';
import { getGrowthEvent } from '../game/game';
import { getGrowthSceneVisual } from '../game/visuals';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../game/types';

export function GrowthScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const event = getGrowthEvent(state)!;
  const visual = getGrowthSceneVisual(event.artAge ?? event.age, event.title);
  return (
    <main className="screen growth-screen">
      <AgeRail age={event.age} label={event.stage} />
      <section className="screen__body">
        <SceneArt visual={visual} />
        <div className="chapter-line"><span>成长档案</span><span>第 {event.age - 3} / 14 年</span></div>
        <h1 className="display-title">{event.title}</h1>
        <p className="story-text">{event.text}</p>
        <p className="story-question">{event.question}</p>
        <MemoryEchoPanel state={state} echo={event.echo} />
        <div className="choice-list" aria-label="选择你的做法">
          {event.choices.map((choice) => (
            <button className="choice" key={choice.id} onClick={() => dispatch({ type: 'CHOOSE_GROWTH', choiceId: choice.id })}>
              <span className="choice__copy"><b>{choice.verb}</b><small>{choice.detail}</small></span>
              <ApproachMark approach={choice.approach} />
            </button>
          ))}
        </div>
        <p className="fine-print">你一定会得到一张与选择有关的牌；代价将在选择后揭晓。</p>
      </section>
    </main>
  );
}
