import { useState } from 'react';
import { AgeRail } from '../components/AgeRail';
import { ApproachMark } from '../components/ApproachMark';
import { CardFace } from '../components/CardFace';
import { SceneArt } from '../components/SceneArt';
import { DECK_SIZE } from '../game/constants';
import { canBeginAdventure } from '../game/game';
import { APPROACH_CLASS, APPROACH_NOTE } from '../game/presentation';
import type { Dispatch } from 'react';
import type { Approach, GameAction, GameState, LifeCard } from '../game/types';

const APPROACHES: Approach[] = ['洞察', '行动', '共情'];

export function DeckScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeApproach, setActiveApproach] = useState<Approach | '已选'>('已选');
  const [selectionNote, setSelectionNote] = useState('系统已先替你整理一套建议：尽量从每种做法中各选两张，再补入综合牌力较强的经历。你可以直接出门，也可以逐张替换。');
  const selectedCards = state.selectedDeck.map((id) => state.cards.find((card) => card.id === id)).filter((card): card is LifeCard => Boolean(card));
  const visibleApproaches = activeApproach === '已选' ? APPROACHES.filter((approach) => selectedCards.some((card) => card.approach === approach)) : [activeApproach];

  function useRecommendedDeck() {
    dispatch({ type: 'AUTO_DECK' });
    setSelectionNote('已恢复均衡建议：尽量从三种做法中各保留两张，再优先选择牌力与守势合计更高的经历。');
  }

  return (
    <main className="wide-screen deck-screen">
      <SceneArt id="deck" className="scene-art--deck" />
      <header className="deck-intro">
        <AgeRail age={18} label="成年" />
        <div>
          <p className="eyebrow">成年行囊 · 从 {state.cards.length} 张记忆中选 {DECK_SIZE} 张</p>
          <h1 className="display-title">世界不问你准备好了没有</h1>
          <p className="lead">这不是一次考试，而是回头看看：长大以后，你最愿意相信哪些曾经救过自己的办法？</p>
        </div>
        <div className="deck-counter"><strong>{state.selectedDeck.length}</strong><span>/ {DECK_SIZE} 已装入</span></div>
      </header>
      <section className="deck-selection" aria-labelledby="deck-selection-title">
        <div className="deck-selection__intro">
          <div><p className="eyebrow">当前随身牌</p><h2 id="deck-selection-title">带进成年的人生片段</h2></div>
          <p role="status">{selectionNote}</p>
        </div>
        <div className="deck-slots">
          {Array.from({ length: DECK_SIZE }, (_, index) => {
            const card = selectedCards[index];
            return card ? (
              <button className={`deck-slot deck-slot--${APPROACH_CLASS[card.approach]}`} key={card.id} onClick={() => dispatch({ type: 'TOGGLE_DECK', cardId: card.id })} aria-label={`移出${card.title}`}>
                <ApproachMark approach={card.approach} /><b>{card.title}</b><span>牌力 {card.power} · 守势 {card.guard}</span><i aria-hidden="true">移出</i>
              </button>
            ) : <span className="deck-slot deck-slot--empty" key={`empty-${index}`}>还空着一格</span>;
          })}
        </div>
      </section>
      <footer id="deck-actions" className="sticky-action" aria-label="成年行囊操作">
        <button className="text-button" onClick={useRecommendedDeck}>恢复均衡建议</button>
        <p>{state.selectedDeck.length === DECK_SIZE ? state.storyEdition === 'echoes' ? `${DECK_SIZE} 张已齐。每章生活结束后，还可以重新整理随身记忆。` : `${DECK_SIZE} 张已齐。成年后仍可在每场牌局里换一次手。` : `还需选择 ${DECK_SIZE - state.selectedDeck.length} 张；先从上方随身牌中移出，再补入新牌。`}</p>
        <button className="primary-button" disabled={!canBeginAdventure(state)} onClick={() => dispatch({ type: 'CONFIRM_DECK' })}>十八岁，确认行囊</button>
      </footer>
      <nav className="deck-filters" aria-label="按做法查看记忆牌">
        {(['已选', ...APPROACHES] as const).map((approach) => (
          <button className={activeApproach === approach ? 'is-active' : ''} aria-pressed={activeApproach === approach} key={approach} onClick={() => setActiveApproach(approach)}>
            {approach}<span>{approach === '已选' ? selectedCards.length : state.cards.filter((card) => card.approach === approach).length}</span>
          </button>
        ))}
        <a className="deck-actions-jump" href="#deck-actions">回到确认区</a>
      </nav>
      <details className="deck-rules" open={rulesOpen} onToggle={(event) => setRulesOpen(event.currentTarget.open)}>
        <summary>需要时再看：成年牌局的完整规则</summary>
        <div className="deck-rules__grid">
          <section><b>牌力</b><p>你出牌后的进攻分。它会加上成长属性、克制、时代气候、组合和人生状态。最终得分高于世界强度，就能推进局面。</p></section>
          <section><b>守势</b><p>失手时的缓冲。心气损失等于双方分差减去守势，最少仍会损失 1 点。守势不增加你的得分。</p></section>
          <section><b>同型</b><p>你的做法与世界牌相同，双方正面对拼，不加不减。克制时 +2，受制时 −1。</p></section>
          <section><b>一场怎么赢</b><p>在规定轮数内把“局面推进”填到目标值。赢一轮至少推进 2，打平推进 1；输了不推进。</p></section>
        </div>
      </details>
      <div className="deck-families">
        {visibleApproaches.map((approach) => {
          const familyCards = state.cards.filter((card) => card.approach === approach && (activeApproach !== '已选' || state.selectedDeck.includes(card.id)));
          return (
            <section className={`deck-family deck-family--${APPROACH_CLASS[approach]}`} key={approach} aria-labelledby={`deck-family-${APPROACH_CLASS[approach]}`}>
              <header><div><ApproachMark approach={approach} /><h2 id={`deck-family-${APPROACH_CLASS[approach]}`}>{APPROACH_NOTE[approach]}</h2></div><span>{familyCards.length} 张记忆</span></header>
              {familyCards.length === 0 ? <p className="deck-family__empty">这一段成长里，你还没有留下属于「{approach}」的牌。</p> : <div className="deck-grid">
                {familyCards.map((card) => (
                <CardFace
                  key={card.id}
                  card={card}
                  selected={state.selectedDeck.includes(card.id)}
                  disabled={!state.selectedDeck.includes(card.id) && state.selectedDeck.length >= DECK_SIZE}
                  onClick={() => {
                    dispatch({ type: 'TOGGLE_DECK', cardId: card.id });
                    setSelectionNote(state.selectedDeck.includes(card.id) ? `已把「${card.title}」放回成长档案。` : `已把「${card.title}」带在身上。`);
                  }}
                  experience={state.cardExperience[card.id] ?? 0}
                  upgraded={state.upgradedCards.includes(card.id)}
                />
                ))}
              </div>}
            </section>
          );
        })}
      </div>
    </main>
  );
}
