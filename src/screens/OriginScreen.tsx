import { AgeRail } from '../components/AgeRail';
import { SceneArt } from '../components/SceneArt';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../game/types';

export function OriginScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const origin = state.origin!;
  return (
    <main className="screen dossier-screen">
      <AgeRail age="00" label="出身" />
      <section className="screen__body">
        <SceneArt id="origin" />
        <p className="eyebrow">市民出生登记副本 · {origin.serial}</p>
        <h1 className="display-title">你只是一个普通人</h1>
        <p className="lead">{origin.sentence}</p>
        <dl className="dossier-grid">
          <div><dt>出生地</dt><dd>{origin.place}</dd></div>
          <div><dt>家庭</dt><dd>{origin.household}</dd></div>
          <div><dt>家中气候</dt><dd>{origin.texture}</dd></div>
          <div><dt>最早留下的东西</dt><dd>{origin.keepsake}</dd></div>
          <div><dt>隐藏天赋</dt><dd>无</dd></div>
          <div><dt>可继承资产</dt><dd>一些爱，一些毛病，一只旧物</dd></div>
        </dl>
        <blockquote>“普通”不是难度选项。它是大多数故事真正开始的地方。</blockquote>
        <div className="button-row">
          <button className="text-button" onClick={() => dispatch({ type: 'REROLL_ORIGIN' })}>换一份普通人生</button>
          <button className="primary-button" onClick={() => dispatch({ type: 'ACCEPT_ORIGIN' })}>收下这份出身</button>
        </div>
      </section>
    </main>
  );
}
