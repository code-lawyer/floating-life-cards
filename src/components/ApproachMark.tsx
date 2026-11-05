import { APPROACH_CLASS } from '../game/presentation';
import type { Approach } from '../game/types';

export function ApproachMark({ approach }: { approach: Approach }) {
  return <span className={`approach approach--${APPROACH_CLASS[approach]}`}>{approach}</span>;
}
