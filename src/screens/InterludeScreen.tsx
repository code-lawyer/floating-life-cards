import { useState } from 'react';
import type { Dispatch } from 'react';
import { CardFace } from '../components/CardFace';
import { SceneArt } from '../components/SceneArt';
import { DECK_SIZE } from '../game/constants';
import { canConfirmInterlude, getChapter, getChapterRecovery, getNextChapter } from '../game/game';
import { getSceneVisual } from '../game/visuals';
import type { Approach, GameAction, GameState } from '../game/types';

export function InterludeScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const [filter, setFilter] = useState<Approach | '全部'>('全部');
  const [notice, setNotice] = useState('先放回一张，再带上另一张；也可以保留原来的八张，直接出发。');
  const chapter = getNextChapter(state)!;
  const previous = getChapter(state)!;
  const draft = state.deckDraft!;
  const recovery = getChapterRecovery(state);
  const added = state.cards.filter((card) => draft.includes(card.id) && !state.selectedDeck.includes(card.id));
  const removed = state.cards.filter((card) => state.selectedDeck.includes(card.id) && !draft.includes(card.id));
  const visual = { ...getSceneVisual('deck'), alt: `前往${chapter.year}岁之前，重新摊开的记忆牌册`, caption: `${chapter.year}岁 · 重新上路` };

  return (
    <main className="wide-screen interlude-screen">
      <SceneArt visual={visual} className="scene-art--deck" />
      <header className="interlude-intro">
        <div>
          <h1 className="display-title">下一程，带上哪些自己</h1>
          <p className="interlude-years">{previous.year} → {chapter.year} 岁</p>
          <p className="lead">{state.encounter!.won ? '上一场局面已经越过。' : '上一场局面没能解开，但你已经走到了这里。'}生活又翻了几页。出发前，你把那些用过、也暂时放下过的记忆重新摊开。</p>
        </div>
        <aside className="interlude-next" aria-labelledby="next-chapter-title">
          <h2 id="next-chapter-title">{chapter.title}</h2>
          <p>{chapter.premise}</p>
          <span>{chapter.rounds} 轮内推进至 {chapter.target} · 具体局面在入场后揭晓</span>
        </aside>
      </header>
      <section className="packing-actions" id="packing-actions" aria-label="下一程行囊操作">
        <div className="packing-count"><strong>{draft.length} / {DECK_SIZE}</strong><span>随身记忆</span></div>
        <p>{draft.length < DECK_SIZE ? `还差 ${DECK_SIZE - draft.length} 张。下面的记忆都可以再带上。` : added.length ? `这次新带上 ${added.length} 张，放回 ${removed.length} 张。` : '仍是原来的八张，也是一种经过考虑的决定。'}</p>
        <button className="primary-button" disabled={!canConfirmInterlude(state)} onClick={() => dispatch({ type: 'CONFIRM_INTERLUDE' })}>带上这八张牌，继续到 {chapter.year} 岁</button>
      </section>
      <div className="interlude-recovery">
        <p>出发时休整：心气 {state.resources.heart} → {state.resources.heart + recovery.heart}，压力 {state.resources.pressure} → {state.resources.pressure + recovery.pressure}。已计入人生状态与资源上限。</p>
        <button className="text-button" onClick={() => { dispatch({ type: 'RESTORE_DECK' }); setNotice('已恢复上一场的八张随身记忆。'); }}>恢复原来的八张</button>
      </div>
      <section className="packing-archive" aria-labelledby="packing-title">
        <header>
          <div><h2 id="packing-title">你的经历，都还在</h2><p>熟练与淬炼会保留。放回牌册的记忆，下一程仍有机会重新带上。</p></div>
          <p className="packing-notice" role="status">{notice}</p>
        </header>
        <nav className="packing-filters" aria-label="按做法整理记忆">
          {(['全部', '洞察', '行动', '共情'] as const).map((approach) => (
            <button key={approach} aria-pressed={filter === approach} onClick={() => setFilter(approach)}>{approach}</button>
          ))}
          <a href="#packing-actions">回到出发处</a>
        </nav>
        <div className="packing-grid">
          {state.cards.filter((card) => filter === '全部' || card.approach === filter).map((card) => (
            <div className={`packing-card ${draft.includes(card.id) ? 'packing-card--selected' : ''}`} key={card.id}>
              <span className="packing-card__state">{draft.includes(card.id) ? state.selectedDeck.includes(card.id) ? '随身' : '这次带上' : '留在牌册'}</span>
              <CardFace card={card} selected={draft.includes(card.id)} upgraded={state.upgradedCards.includes(card.id)} experience={state.cardExperience[card.id] ?? 0}
                disabled={!draft.includes(card.id) && draft.length === DECK_SIZE}
                actionPrefix={draft.includes(card.id) ? '放回牌册' : '带上记忆'}
                onClick={() => { dispatch({ type: 'TOGGLE_DECK', cardId: card.id }); setNotice(draft.includes(card.id) ? `「${card.title}」已放回牌册，记忆仍然属于你。` : `这一次，你决定带上「${card.title}」。`); }} />
            </div>
          ))}
        </div>
        {filter !== '全部' && !state.cards.some((card) => card.approach === filter) && <p className="packing-empty">这一生还没有留下「{filter}」做法的记忆。可以切换到其他做法继续整理。</p>}
        <a className="packing-return" href="#packing-actions">整理好了，回到出发处</a>
      </section>
    </main>
  );
}
