import { DialogShell } from './DialogShell';
import { DECK_SIZE } from '../game/constants';

export function GameGuide({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell className="game-guide" labelledBy="game-guide-title" onClose={onClose}>
      <header><div><p className="eyebrow">随时可查 · 完整规则</p><h2 id="game-guide-title">怎样玩《浮生牌局》</h2></div><button data-autofocus onClick={onClose} aria-label="关闭玩法说明">关闭</button></header>
      <div className="guide-flow" aria-label="游戏流程">
        <span><b>4–17 岁</b>选择成长，获得记忆牌并承担随机代价</span>
        <span><b>18 岁</b>从 15 张记忆里挑 {DECK_SIZE} 张随身牌</span>
        <span><b>成年期</b>出牌应对五场世界局面，穿插十次生活事件</span>
        <span><b>结卷</b>胜负、资源、成长倾向和人生状态共同形成结局</span>
      </div>
      <section className="guide-section">
        <h3>先认识一张牌</h3>
        <div className="guide-glossary">
          <div><b>牌力</b><p>你的基础得分。结算时还会加上成长、克制、气候、组合和人生状态。</p></div>
          <div><b>守势</b><p>只在失手时生效，用来减少心气损失；它不会增加得分。</p></div>
          <div><b>牌面效果</b><p>牌底部的紫色文字，例如胜出后多抽一张、压力高时增强或恢复资源。</p></div>
          <div><b>洞察 / 行动 / 共情</b><p>三种做法，也是克制关系的三种牌型。</p></div>
        </div>
      </section>
      <section className="guide-section">
        <h3>一轮怎样结算</h3>
        <div className="guide-equation"><span>你的预计得分</span><b>与</b><span>世界当前强度</span></div>
        <ul>
          <li><b>你的得分更高：</b>赢下这轮，至少推进 2 点；领先越多，推进越多。</li>
          <li><b>双方相等：</b>这叫僵持，推进 1 点，同时压力 +1。</li>
          <li><b>你的得分更低：</b>不推进，并损失心气。守势会抵消一部分损失，但最少仍损失 1。</li>
        </ul>
        <p>在规定轮数内把“局面推进”填满，就越过这场局面。失败不会读档重来，故事会带着后果继续。</p>
      </section>
      <section className="guide-section">
        <h3>克制与“同型”</h3>
        <div className="guide-triangle"><span>行动 ＞ 洞察</span><span>洞察 ＞ 共情</span><span>共情 ＞ 行动</span></div>
        <p><b>克制</b>世界牌时得分 +2；被克制时 −1。你的牌和世界牌属于同一种做法，就叫<b>同型</b>，得分不加不减，直接比较其他加成。</p>
      </section>
      <section className="guide-section">
        <h3>旧经历怎样改变后来</h3>
        <p>有些童年选择会在几年后继续，或成为成年生活里的另一种回答。“旧事回响”会展示属于你的那张记忆；有些办法需要你真的做过那件事，也仍要承担眼前的时间、心气或余钱成本。</p>
        <p>新的人生在启程时有一次休整：心气不足 3 点时补到 3 点。它不会抹掉童年的代价，也不保证后来每一场都能赢。更新前已经开始的人生沿用原有故事。</p>
      </section>
      <section className="guide-section">
        <h3>进阶机制</h3>
        <ul>
          <li>连续使用同一种做法：触发“惯用手”，本轮 +1。</li>
          <li>最近三轮恰好包含三种做法：触发“三式合流”，本轮 +3、压力 −1。</li>
          <li>同一张牌累计使用两次：完成淬炼，此后永久牌力 +1。</li>
          <li>记忆牌不会被永久消耗；每场结束后都会回到应对组。童年余温只负责在当前场次提前召回一张已用牌。</li>
          <li>每场可换手一次，通常压力 +1；时代气候和人生状态会继续修改规则。</li>
          <li>回响故事在每章生活结束后可以重新整理八张随身牌。调整不消耗资源，记忆的熟练与淬炼保留；确认出发时才结算原有章节休整。早期经典存档继续原流程。</li>
        </ul>
      </section>
      <section className="guide-section guide-section--llm">
        <h3>LLM 裁判是做什么的？</h3>
        <p>它只替每轮写一段更贴合当前记忆的叙述，不决定得分、抽牌、随机数或胜负。完全可选；不设置时，游戏使用内置文案。开发者接入步骤在顶部“设置”里的二级区域。</p>
      </section>
      <button className="primary-button" onClick={onClose}>看懂了，回到游戏</button>
    </DialogShell>
  );
}
