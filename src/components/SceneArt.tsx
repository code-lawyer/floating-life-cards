import type { CSSProperties } from 'react';
import { getSceneVisual, type SceneVisual, type StaticSceneVisualId } from '../game/visuals';

export function SceneArt({ id, visual: suppliedVisual, className = '' }: { id?: StaticSceneVisualId; visual?: SceneVisual; className?: string }) {
  const visual = suppliedVisual ?? (id ? getSceneVisual(id) : null);
  if (!visual) throw new Error('SceneArt 需要 id 或 visual');

  return (
    <figure className={`scene-art scene-art--${visual.tone} ${className}`} data-visual-id={visual.id} aria-hidden="true">
      <img
        src={visual.src}
        alt=""
        loading="lazy"
        decoding="async"
        style={{ '--desktop-position': visual.desktopPosition, '--mobile-position': visual.mobilePosition } as CSSProperties}
      />
      <figcaption className="visually-hidden">{visual.caption}</figcaption>
    </figure>
  );
}
