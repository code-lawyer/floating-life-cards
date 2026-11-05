import { LifeMarkTag } from '../components/LifeMarkTag';
import { SceneArt } from '../components/SceneArt';
import { LifeThreads } from '../components/LifeThreads';
import { DeckJourney } from '../components/DeckJourney';
import type { GameState } from '../game/types';

export function EndingScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const ending = state.ending!;
  const wins = state.chapterResults.filter(Boolean).length;
  return (
    <main className="ending-screen">
      <SceneArt id="ending" className="scene-art--ending" />
      <p className="eyebrow">人生档案 · 暂时结卷</p>
      <div className="ending-mark" aria-hidden="true">完</div>
      <h1>{ending.title}</h1>
      <p className="ending-kicker">{ending.kicker}</p>
      <p className="ending-text">{ending.text}</p>
      <blockquote>{ending.postscript}</blockquote>
      <LifeThreads state={state} />
      <DeckJourney state={state} />
      <dl className="ending-stats">
        <div><dt>越过局面</dt><dd>{wins} / {state.chapterResults.length}</dd></div>
        <div><dt>洞察</dt><dd>{state.traits.insight}</dd></div>
        <div><dt>行动</dt><dd>{state.traits.nerve}</dd></div>
        <div><dt>共情</dt><dd>{state.traits.empathy}</dd></div>
        <div><dt>留下的牌</dt><dd>{state.cards.length}</dd></div>
        <div><dt>成年事件</dt><dd>{state.adultEventsResolved.length}</dd></div>
        <div><dt>淬炼牌</dt><dd>{state.upgradedCards.length}</dd></div>
      </dl>
      {state.marks.length > 0 && (
        <section className="ending-marks">
          <p className="eyebrow">带到最后的人生状态</p>
          <div>{state.marks.map((mark) => <LifeMarkTag mark={mark} key={mark.id} />)}</div>
        </section>
      )}
      <div className="ending-actions">
        <button className="text-button" onClick={() => window.print()}>打印这份人生档案</button>
        <button className="primary-button" onClick={onRestart}>再活一次</button>
      </div>
    </main>
  );
}
