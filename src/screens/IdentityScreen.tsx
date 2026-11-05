import { AgeRail } from '../components/AgeRail';
import { SceneArt } from '../components/SceneArt';
import { deriveStartingIdentity, getStartingIdentity } from '../game/identities';
import { getDepartureRecovery } from '../game/story';
import type { Dispatch } from 'react';
import type { GameAction, GameState } from '../game/types';

export function IdentityScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const identity = getStartingIdentity(state.startingIdentity)!;
  const profile = deriveStartingIdentity(state.cards, state.traits, state.resources);
  const recovery = getDepartureRecovery(state);
  return (
    <main className="screen identity-screen">
      <AgeRail age={18} label="起手身份" />
      <section className="screen__body">
        <SceneArt id="deck" />
        <h1 className="display-title">你以「{identity.title}」进入成年</h1>
        <p className="lead">{identity.description}</p>
        <section className="identity-profile" aria-label="起手身份形成原因">
          <header><span>系统生成，不是人生等级</span><b>{identity.passiveText}</b></header>
          <ol>{profile.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ol>
          <p>身份只决定成年开局的一项规则和部分处境称呼。童年记忆仍是你真正反复使用的牌。</p>
        </section>
        {recovery > 0 && (
          <section className="departure-rest" aria-labelledby="departure-rest-title">
            <div><h2 id="departure-rest-title">出发前，先喘一口气</h2><p>童年已经付出的代价仍留在档案里。启程前的一次休整，让你有余力试着打出自己的牌。</p></div>
            <p className="departure-rest__change"><span>心气</span><strong>{state.resources.heart} → 3</strong><span>进入成年时恢复 {recovery} 点 · 仅此一次</span></p>
          </section>
        )}
        <button className="primary-button" onClick={() => dispatch({ type: 'BEGIN_ADVENTURE' })}>以这个起点进入成年牌局</button>
      </section>
    </main>
  );
}
