import { memoryForEcho } from '../game/story';
import type { GameState, MemoryEcho } from '../game/types';

/** A small, readable piece of the actual childhood archive alongside today's decision. */
export function MemoryEchoPanel({ state, echo }: { state: GameState; echo?: MemoryEcho }) {
  if (!echo) return null;
  const memory = memoryForEcho(state, echo);
  if (!memory) return null;
  return (
    <aside className="memory-echo" aria-label="这段经历从哪里来">
      <div className="memory-echo__age"><strong>{echo.sourceAge}</strong><span>岁留下的牌</span></div>
      <div>
        <h2>你还记得「{memory.title}」</h2>
        <p className="memory-echo__memory">{memory.memory}</p>
        <p>{echo.text}</p>
      </div>
    </aside>
  );
}
