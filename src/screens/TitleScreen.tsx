import { STARTING_IDENTITIES } from '../game/identities';
import type { StartingIdentityId } from '../game/types';

export function TitleScreen({ onStart, onGuide, onPrototype, playtestOnly }: {
  onStart: () => void;
  onGuide: () => void;
  onPrototype: (identityId: StartingIdentityId) => void;
  playtestOnly: boolean;
}) {
  if (playtestOnly) {
    return (
      <main className="title-screen title-screen--playtest">
        <div className="title-screen__register" aria-hidden="true">P1 / 成年牌局 / 固定身份</div>
        <p className="eyebrow">阶段 1 · 核心规则验证</p>
        <h1>浮生<br />牌局</h1>
        <section className="prototype-entry prototype-entry--playtest" aria-labelledby="prototype-entry-title">
          <header><span>本轮试玩入口</span><h2 id="prototype-entry-title">成年困局规则试玩</h2></header>
          <p>本轮不会经历童年，也不会根据童年生成身份。请按主持人分配，选择一个固定起手身份，直接进入24岁的合同牌局。</p>
          <div>
            {STARTING_IDENTITIES.map((identity) => (
              <button key={identity.id} onClick={() => onPrototype(identity.id)} aria-label={`以${identity.title}开始原型`}>
                <b>{identity.title}</b><span>{identity.passiveText}</span>
              </button>
            ))}
          </div>
          <button className="text-button prototype-entry__guide" onClick={onGuide}>先读成年牌局规则</button>
        </section>
      </main>
    );
  }

  return (
    <main className="title-screen">
      <img
        className="title-key-art"
        src="./art/title-key-art-v1.webp"
        alt="童年记忆与成年档案交叠的城市书桌"
      />
      <div className="title-screen__register" aria-hidden="true">出生登记 / 未定级 / 普通人</div>
      <p className="eyebrow">一款人生故事与选择牌局</p>
      <h1>浮生<br />牌局</h1>
      <p className="title-screen__thesis">从四岁开始，<br />为十八岁后的自己攒一手牌。</p>
      <div className="title-screen__rule">
        <p>没有天选身份。</p>
        <p>每次选择都会留下牌，也会收走一点什么。</p>
        <p>世界不保证公平，但承认你出过的每一张牌。</p>
      </div>
      <div className="title-actions">
        <button className="primary-button primary-button--large" onClick={onStart}>登记出生</button>
        <button className="text-button" onClick={onGuide}>先读玩法说明</button>
      </div>
      <p className="title-screen__save-note">进度自动保存在本机 · 单局约 35–50 分钟</p>
      <section className="prototype-entry" aria-labelledby="prototype-entry-title">
        <header><span>制作中 · 规则试玩</span><h2 id="prototype-entry-title">直接进入成年牌局</h2></header>
        <p>跳过童年，用同一副固定记忆比较三个起手身份。此入口只用于验证核心玩法。</p>
        <div>
          {STARTING_IDENTITIES.map((identity) => (
            <button key={identity.id} onClick={() => onPrototype(identity.id)} aria-label={`以${identity.title}开始原型`}>
              <b>{identity.title}</b><span>{identity.passiveText}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
