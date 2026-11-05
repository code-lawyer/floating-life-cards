import type { GameState } from '../game/types';

export function Journal({ state }: { state: GameState }) {
  return (
    <details className="journal">
      <summary>人生档案 <span>{state.journal.length} 条</span></summary>
      <div className="journal__entries">
        {state.journal.map((entry, index) => (
          // 档案只追加、不重排，索引参与 key 是安全的。
          <article className={`journal-entry journal-entry--${entry.tone ?? 'plain'}`} key={`${entry.stamp}-${index}`}>
            <span>{entry.stamp}</span><h3>{entry.title}</h3><p>{entry.body}</p>
          </article>
        ))}
      </div>
    </details>
  );
}
