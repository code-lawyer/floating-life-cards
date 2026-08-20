import type { CSSProperties } from 'react';
import { getChoiceFocalPoint, getSceneVisual, type SceneVisual, type StaticSceneVisualId } from '../game/visuals';

export function SceneArt({ id, visual: suppliedVisual, className = '' }: { id?: StaticSceneVisualId; visual?: SceneVisual; className?: string }) {
  const visual = suppliedVisual ?? (id ? getSceneVisual(id) : null);
  if (!visual) throw new Error('SceneArt 需要 id 或 visual');

  return (
    <figure className={`scene-art scene-art--${visual.tone} ${className}`} data-visual-id={visual.id}>
      <img src={visual.src} alt={visual.alt} style={{ '--desktop-position': visual.desktopPosition, '--mobile-position': visual.mobilePosition } as CSSProperties} />
      <figcaption>{visual.caption}</figcaption>
    </figure>
  );
}

export function ChoiceArt({ id, visual: suppliedVisual, index, label }: { id?: StaticSceneVisualId; visual?: SceneVisual; index: number; label: string }) {
  const visual = suppliedVisual ?? (id ? getSceneVisual(id) : null);
  if (!visual) throw new Error('ChoiceArt 需要 id 或 visual');
  return (
    <img
      className="choice__art"
      src={visual.src}
      alt={`「${label}」选择插图`}
      style={{ objectPosition: getChoiceFocalPoint(visual, index) }}
    />
  );
}
