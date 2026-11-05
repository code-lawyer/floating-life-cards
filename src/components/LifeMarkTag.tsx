import type { AdultMark } from '../game/types';

export function LifeMarkTag({ mark, verbose = false }: { mark: AdultMark; verbose?: boolean }) {
  return (
    <span className={`life-mark life-mark--${mark.tone}`} tabIndex={0} aria-label={`${mark.title}：${mark.description}`}>
      {verbose ? `${mark.title}：${mark.description}` : mark.title}
      {!verbose && <span className="life-mark__description" aria-hidden="true">{mark.description}</span>}
    </span>
  );
}
