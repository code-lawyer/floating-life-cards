import { getLifeThreads } from '../game/story';
import type { GameState } from '../game/types';

export function LifeThreads({ state }: { state: GameState }) {
  const threads = getLifeThreads(state);
  if (!threads.length) return null;
  return (
    <section className="life-threads" aria-labelledby="life-threads-title">
      <h2 id="life-threads-title">有些牌，隔了很多年才读懂</h2>
      <p className="life-threads__intro">这些事在同一份人生里发生过。你带走的不只有分数。</p>
      {threads.map((thread) => (
        <article className="life-thread" key={thread.id}>
          <h3>{thread.title}</h3>
          <ol className="life-thread__path">
            <li><span>{thread.origin.originAge} 岁</span><strong>{thread.origin.title}</strong><p>{thread.origin.memory}</p></li>
            <li><span>{thread.continuation.originAge} 岁</span><strong>{thread.continuation.title}</strong><p>{thread.continuation.memory}</p></li>
            {thread.choice ? (
              <li><span>{thread.adultEvent.age} 岁</span><strong>{thread.choice}</strong><p>{thread.outcome}</p></li>
            ) : (
              <li className="life-thread__unwritten"><span>尚未展开</span><strong>故事还留着下一页</strong><p>这段经历还没有遇到成年后的回声。没有被用到，不等于没有意义。</p></li>
            )}
          </ol>
        </article>
      ))}
    </section>
  );
}
