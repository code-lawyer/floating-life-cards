import { CHAPTERS } from '../game/content';
import type { GameState } from '../game/types';

export function DeckJourney({ state }: { state: GameState }) {
  if (state.deckRevisions.length === 0) return null;
  return (
    <section className="deck-journey" aria-labelledby="deck-journey-title">
      <h2 id="deck-journey-title">你曾这样重新上路</h2>
      <p>有些办法一直带着，有些在后来才重新想起。这是你实际整理过的行囊。</p>
      <ol>
        {state.deckRevisions.map((revision) => {
          const chapter = CHAPTERS[revision.chapterIndex]!;
          const added = state.cards.filter((card) => revision.after.includes(card.id) && !revision.before.includes(card.id));
          const removed = state.cards.filter((card) => revision.before.includes(card.id) && !revision.after.includes(card.id));
          return (
            <li key={revision.chapterIndex}>
              <span>{chapter.year} 岁</span>
              <div><h3>{chapter.title}</h3>
                {added.length ? <><p>带上 {added.map((card) => `「${card.title}」`).join('、')}</p><p className="deck-journey__returned">放回牌册 {removed.map((card) => `「${card.title}」`).join('、')}</p></> : <p>重新看过这些经历后，你保留了原来的八张。</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
