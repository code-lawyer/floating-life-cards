import { CardFace } from './CardFace';
import type { CombatPreview, LifeCard } from '../game/types';

/** 一张可出的手牌：牌面、克制关系、预计比分，以及展开后的逐项加成。 */
export function HandOption({ card, preview, recommended, disabled, experience, upgraded, showBreakdown, onPlay }: {
  card: LifeCard;
  preview: CombatPreview;
  recommended: boolean;
  disabled: boolean;
  experience: number;
  upgraded: boolean;
  showBreakdown: boolean;
  onPlay: () => void;
}) {
  const { relation, playerScore, worldScore } = preview;
  const prediction = playerScore > worldScore ? '可推进' : playerScore === worldScore ? '会僵持' : '会受挫';
  const outcomeClass = playerScore > worldScore ? 'win' : playerScore === worldScore ? 'draw' : 'loss';
  const relationId = `play-relation-${card.id}`;
  const previewId = `play-preview-${card.id}`;

  return (
    <div className={`hand-option ${recommended ? 'hand-option--recommended' : ''}`}>
      {recommended && <span className="recommended-stamp">建议先出这张</span>}
      <CardFace
        card={card}
        compact
        actionPrefix="唤起"
        describedBy={`${relationId} ${previewId}`}
        disabled={disabled}
        onClick={onPlay}
        experience={experience}
        upgraded={upgraded}
      />
      <span id={relationId} className={`relation relation--${relation}`}>
        {relation === 'advantage' ? '克制 · 牌力 +2' : relation === 'disadvantage' ? '受制 · 牌力 −1' : '同型 · 正面对拼'}
      </span>
      <div id={previewId} className={`score-preview score-preview--${outcomeClass}`}>
        <span>预计得分</span><b>{playerScore}</b><i>对</i><b>{worldScore}</b><em>{prediction}</em>
      </div>
      {showBreakdown && (
        <details className="score-breakdown">
          <summary>得分怎样算出来？</summary>
          <div>{preview.modifiers.map((modifier) => <span key={modifier.label}>{modifier.label}<b>{modifier.value >= 0 ? '+' : ''}{modifier.value}</b></span>)}</div>
        </details>
      )}
    </div>
  );
}
