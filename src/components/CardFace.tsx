import { ApproachMark } from './ApproachMark';
import type { LifeCard } from '../game/types';

export function CardFace({ card, selected, disabled, onClick, actionPrefix, describedBy, compact = false, experience = 0, upgraded = false }: {
  card: LifeCard;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  actionPrefix?: string;
  describedBy?: string;
  compact?: boolean;
  experience?: number;
  upgraded?: boolean;
}) {
  const content = (
    <>
      <div className="card__topline">
        <ApproachMark approach={card.approach} />
        <span className="card__age">{typeof card.originAge === 'number' ? `${card.originAge} 岁` : card.originAge === '世界' ? '世界牌' : '出身牌'}</span>
      </div>
      {(experience > 0 || upgraded) && <span className={`card__mastery ${upgraded ? 'card__mastery--done' : ''}`}>{upgraded ? '已淬炼 · 牌力 +1' : `熟练 ${experience} / 2`}</span>}
      <h3>{card.title}</h3>
      <p className="card__memory">{card.memory}</p>
      <p className="card__effect">{card.effect.description}</p>
      <div className="card__numbers" aria-label={`牌力 ${card.power + (upgraded ? 1 : 0)}，守势 ${card.guard}`}>
        <span>牌力 <b>{card.power + (upgraded ? 1 : 0)}</b></span>
        <span>守势 <b>{card.guard}</b></span>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button className={`life-card ${compact ? 'life-card--compact' : ''} ${selected ? 'life-card--selected' : ''}`} disabled={disabled} onClick={onClick} aria-describedby={describedBy} aria-pressed={selected}>
        {actionPrefix && <span className="visually-hidden">{actionPrefix} </span>}
        {content}
      </button>
    );
  }
  return <article className="life-card">{content}</article>;
}
