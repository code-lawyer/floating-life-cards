import { RESOURCE_META } from '../game/presentation';
import type { GameState, ResourceKey } from '../game/types';

export function ResourceStrip({ state }: { state: GameState }) {
  return (
    <dl className="resource-strip" aria-label="当前状态">
      {(Object.keys(RESOURCE_META) as ResourceKey[]).map((key) => {
        const meta = RESOURCE_META[key];
        const value = state.resources[key];
        return (
          <div className={`resource ${meta.inverse && value >= 6 ? 'resource--danger' : ''}`} key={key}>
            <dt>{meta.label}</dt>
            <dd><span aria-hidden="true">{meta.sign}</span>{value}<small>/9</small></dd>
          </div>
        );
      })}
    </dl>
  );
}
