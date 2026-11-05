import { ApproachMark } from './ApproachMark';
import type { Intent, RoundRecord } from '../game/types';

/** 第一次上桌的三步教学。每步只讲一件事，且都可随时跳过。 */
type DuelCoachProps =
  | { step: 0; intent: Intent; worldPower: number; onSkip: () => void; onNext: () => void }
  | { step: 1; cardTitle: string; playerScore: number; worldPower: number; onSkip: () => void }
  | { step: 2; record: RoundRecord; onDismiss: () => void };

export function DuelCoach(props: DuelCoachProps) {
  if (props.step === 0) {
    return (
      <section className="duel-coach" aria-labelledby="duel-coach-title">
        <span>第一次上桌 · 第一步</span>
        <div>
          <h2 id="duel-coach-title">先看世界出了什么</h2>
          <p>右边暂时不用算。当前世界牌是 <ApproachMark approach={props.intent.approach} />「{props.intent.title}」，强度 <b>{props.worldPower}</b>。记住这两个信息就够了。</p>
        </div>
        <div className="duel-coach__actions">
          <button className="text-button" onClick={props.onSkip}>跳过教学</button>
          <button className="primary-button" onClick={props.onNext}>去看我的手牌</button>
        </div>
      </section>
    );
  }

  if (props.step === 1) {
    return (
      <section className="duel-coach" aria-labelledby="duel-coach-title">
        <span>第一次上桌 · 第二步</span>
        <div>
          <h2 id="duel-coach-title">先打一张有把握的牌</h2>
          <p>我替你标出了「{props.cardTitle}」。它预计能打出 <b>{props.playerScore}</b> 分，对上世界的 <b>{props.worldPower}</b> 分。你可以按推荐出牌，也可以自己选。</p>
        </div>
        <button className="text-button" onClick={props.onSkip}>我自己来</button>
      </section>
    );
  }

  const { record } = props;
  return (
    <section className="duel-coach duel-coach--result" aria-labelledby="duel-coach-title">
      <span>第一次上桌 · 第三步</span>
      <div>
        <h2 id="duel-coach-title">先看结果，再学下一条</h2>
        <p>
          这一轮是 <b>{record.playerScore} 对 {record.worldScore}</b>：
          {record.outcome === 'win' ? '你推进了局面。' : record.outcome === 'draw' ? '双方僵持，但仍推进了 1 点。' : '你没有推进，守势替你减少了心气损失。'}
          {' '}接下来才需要留意换手、连招和详细加成。
        </p>
      </div>
      <button className="primary-button" onClick={props.onDismiss}>知道了，继续</button>
    </section>
  );
}
