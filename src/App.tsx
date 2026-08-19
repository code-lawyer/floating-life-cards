import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { CHAPTERS } from './game/content';
import {
  canChooseAdultChoice,
  canBeginAdventure,
  createGame,
  getAdultEvent,
  getChapter,
  getGrowthEvent,
  getWorldPower,
  previewCardPlay,
  reduceGame,
} from './game/game';
import { requestJudgeNarration } from './game/judge';
import { clearSave, loadGame, saveGame } from './game/persistence';
import { resourceDeltaLabel, resourceDeltaTone } from './game/presentation';
import type { ReactNode } from 'react';
import type { Approach, AdultMark, GameState, LifeCard, ResourceKey } from './game/types';

const RESOURCE_META: Record<ResourceKey, { label: string; sign: string; inverse?: boolean }> = {
  heart: { label: '心气', sign: '心' },
  money: { label: '余钱', sign: '钱' },
  bonds: { label: '人情', sign: '人' },
  pressure: { label: '压力', sign: '压', inverse: true },
};

const APPROACH_CLASS: Record<Approach, string> = {
  洞察: 'insight',
  行动: 'action',
  共情: 'empathy',
};

const APPROACH_NOTE: Record<Approach, string> = {
  洞察: '看清局势，再找到缝隙',
  行动: '先迈出去，让局面改变',
  共情: '理解他人，也让彼此靠近',
};

function initialState(): GameState {
  return loadGame() ?? createGame();
}

function ResourceStrip({ state }: { state: GameState }) {
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

function ApproachMark({ approach }: { approach: Approach }) {
  return <span className={`approach approach--${APPROACH_CLASS[approach]}`}>{approach}</span>;
}

function LifeMarkTag({ mark, verbose = false }: { mark: AdultMark; verbose?: boolean }) {
  return (
    <span className={`life-mark life-mark--${mark.tone}`} tabIndex={0} aria-label={`${mark.title}：${mark.description}`}>
      {verbose ? `${mark.title}：${mark.description}` : mark.title}
      {!verbose && <span className="life-mark__description" aria-hidden="true">{mark.description}</span>}
    </span>
  );
}

function CardFace({ card, selected, disabled, onClick, compact = false, experience = 0, upgraded = false }: {
  card: LifeCard;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  compact?: boolean;
  experience?: number;
  upgraded?: boolean;
}) {
  const content = (
    <>
      <div className="card__topline">
        <ApproachMark approach={card.approach} />
        <span className="card__age">{typeof card.originAge === 'number' ? `${card.originAge} 岁` : card.originAge === '世界' ? '世界牌' : '出身牌'}</span>
      </div>
      {(experience > 0 || upgraded) && <span className={`card__mastery ${upgraded ? 'card__mastery--done' : ''}`}>{upgraded ? '已淬炼 · 牌力 +1' : `熟练 ${experience} / 2`}</span>}
      <h3>{card.title}</h3>
      {!compact && <p className="card__memory">{card.memory}</p>}
      <p className="card__effect">{card.effect.description}</p>
      <div className="card__numbers" aria-label={`牌力 ${card.power}，守势 ${card.guard}`}>
        <span>牌力 <b>{card.power + (upgraded ? 1 : 0)}</b></span>
        <span>守势 <b>{card.guard}</b></span>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button className={`life-card ${selected ? 'life-card--selected' : ''}`} disabled={disabled} onClick={onClick} aria-pressed={selected}>
        {content}
      </button>
    );
  }
  return <article className="life-card">{content}</article>;
}

function AgeRail({ age, label }: { age: number | string; label: string }) {
  return (
    <aside className="age-rail" aria-label={`${age} 岁，${label}`}>
      <span className="age-rail__number">{age}</span>
      <span className="age-rail__label">岁 / {label}</span>
    </aside>
  );
}

function TitleScreen({ onStart, onGuide }: { onStart: () => void; onGuide: () => void }) {
  return (
    <main className="title-screen">
      <div className="title-screen__register" aria-hidden="true">出生登记 / 未定级 / 普通人</div>
      <p className="eyebrow">一款纯文字成长牌局</p>
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
    </main>
  );
}

function OriginScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]> }) {
  const origin = state.origin!;
  return (
    <main className="screen dossier-screen">
      <AgeRail age="00" label="出身" />
      <section className="screen__body">
        <p className="eyebrow">市民出生登记副本 · {origin.serial}</p>
        <h1 className="display-title">你只是一个普通人</h1>
        <p className="lead">{origin.sentence}</p>
        <dl className="dossier-grid">
          <div><dt>出生地</dt><dd>{origin.place}</dd></div>
          <div><dt>家庭</dt><dd>{origin.household}</dd></div>
          <div><dt>家中气候</dt><dd>{origin.texture}</dd></div>
          <div><dt>最早留下的东西</dt><dd>{origin.keepsake}</dd></div>
          <div><dt>隐藏天赋</dt><dd>无</dd></div>
          <div><dt>可继承资产</dt><dd>一些爱，一些毛病，一只旧物</dd></div>
        </dl>
        <blockquote>“普通”不是难度选项。它是大多数故事真正开始的地方。</blockquote>
        <div className="button-row">
          <button className="text-button" onClick={() => dispatch({ type: 'REROLL_ORIGIN' })}>换一份普通人生</button>
          <button className="primary-button" onClick={() => dispatch({ type: 'ACCEPT_ORIGIN' })}>收下这份出身</button>
        </div>
      </section>
    </main>
  );
}

function GrowthScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]> }) {
  const event = getGrowthEvent(state)!;
  return (
    <main className="screen growth-screen">
      <AgeRail age={event.age} label={event.stage} />
      <section className="screen__body">
        <div className="chapter-line"><span>成长档案</span><span>第 {event.age - 3} / 14 年</span></div>
        <p className="eyebrow">{event.stage} · {event.age} 岁</p>
        <h1 className="display-title">{event.title}</h1>
        <p className="story-text">{event.text}</p>
        <p className="story-question">{event.question}</p>
        <div className="choice-list" aria-label="选择你的做法">
          {event.choices.map((choice, index) => (
            <button className="choice" key={choice.id} onClick={() => dispatch({ type: 'CHOOSE_GROWTH', choiceId: choice.id })}>
              <span className="choice__key">{String.fromCharCode(65 + index)}</span>
              <span className="choice__copy"><b>{choice.verb}</b><small>{choice.detail}</small></span>
              <ApproachMark approach={choice.approach} />
            </button>
          ))}
        </div>
        <p className="fine-print">你一定会得到一张与选择有关的牌；代价将在选择后揭晓。</p>
      </section>
    </main>
  );
}

function GrowthResultScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]> }) {
  const result = state.growthResult!;
  const resourceDelta = result.cost.resource === 'pressure' ? result.cost.amount : -result.cost.amount;
  const isGain = resourceDeltaTone(result.cost.resource, resourceDelta) === 'positive';
  return (
    <main className="screen result-screen">
      <AgeRail age={result.age} label="已归档" />
      <section className="screen__body result-layout">
        <div>
          <p className="eyebrow">选择已发生 · 无法撤回</p>
          <h1 className="display-title">你选择了：{result.choice}</h1>
          <p className="lead">{result.text}</p>
          <div className={`cost-stamp ${isGain ? 'cost-stamp--gain' : ''}`}>
            <span>{isGain ? '意外所得' : '随机代价'}</span>
            <b>{resourceDeltaLabel(result.cost.resource, resourceDelta)}</b>
          </div>
          <button className="primary-button" onClick={() => dispatch({ type: 'CONTINUE_GROWTH' })}>
            {result.age === 17 ? '带着这些牌成年' : `继续到 ${result.age + 1} 岁`}
          </button>
        </div>
        <div className="acquired-card">
          <p className="eyebrow">新记忆入手</p>
          <CardFace card={result.card} />
        </div>
      </section>
    </main>
  );
}

function DeckScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]> }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [activeApproach, setActiveApproach] = useState<Approach | '已选'>('已选');
  const [selectionNote, setSelectionNote] = useState('系统已先替你整理一套建议：尽量从每种做法中各选两张，再补入综合牌力较强的经历。你可以直接出门，也可以逐张替换。');
  const approaches: Approach[] = ['洞察', '行动', '共情'];
  const selectedCards = state.selectedDeck.map((id) => state.cards.find((card) => card.id === id)).filter((card): card is LifeCard => Boolean(card));
  const visibleApproaches = activeApproach === '已选' ? approaches.filter((approach) => selectedCards.some((card) => card.approach === approach)) : [activeApproach];

  function useRecommendedDeck() {
    dispatch({ type: 'AUTO_DECK' });
    setSelectionNote('已恢复均衡建议：尽量从三种做法中各保留两张，再优先选择牌力与守势合计更高的经历。');
  }

  return (
    <main className="wide-screen deck-screen">
      <header className="deck-intro">
        <AgeRail age={18} label="成年" />
        <div>
          <p className="eyebrow">成年行囊 · 从 {state.cards.length} 张记忆中选 8 张</p>
          <h1 className="display-title">世界不问你准备好了没有</h1>
          <p className="lead">这不是一次考试，而是回头看看：长大以后，你最愿意相信哪些曾经救过自己的办法？</p>
        </div>
        <div className="deck-counter"><strong>{state.selectedDeck.length}</strong><span>/ 8 已装入</span></div>
      </header>
      <section className="deck-selection" aria-labelledby="deck-selection-title">
        <div className="deck-selection__intro">
          <div><p className="eyebrow">当前随身牌</p><h2 id="deck-selection-title">带进成年的人生片段</h2></div>
          <p role="status">{selectionNote}</p>
        </div>
        <div className="deck-slots">
          {Array.from({ length: 8 }, (_, index) => {
            const card = selectedCards[index];
            return card ? (
              <button className={`deck-slot deck-slot--${APPROACH_CLASS[card.approach]}`} key={card.id} onClick={() => dispatch({ type: 'TOGGLE_DECK', cardId: card.id })} aria-label={`移出${card.title}`}>
                <ApproachMark approach={card.approach} /><b>{card.title}</b><span>牌力 {card.power} · 守势 {card.guard}</span><i aria-hidden="true">移出</i>
              </button>
            ) : <span className="deck-slot deck-slot--empty" key={`empty-${index}`}>还空着一格</span>;
          })}
        </div>
      </section>
      <footer className="sticky-action">
        <button className="text-button" onClick={useRecommendedDeck}>恢复均衡建议</button>
        <p>{state.selectedDeck.length === 8 ? '八张已齐。成年后仍可在每场牌局里换一次手。' : `还需选择 ${8 - state.selectedDeck.length} 张；先从上方随身牌中移出，再补入新牌。`}</p>
        <button className="primary-button" disabled={!canBeginAdventure(state)} onClick={() => dispatch({ type: 'BEGIN_ADVENTURE' })}>十八岁，出门</button>
      </footer>
      <nav className="deck-filters" aria-label="按做法查看记忆牌">
        {(['已选', ...approaches] as const).map((approach) => (
          <button className={activeApproach === approach ? 'is-active' : ''} aria-pressed={activeApproach === approach} key={approach} onClick={() => setActiveApproach(approach)}>
            {approach}<span>{approach === '已选' ? selectedCards.length : state.cards.filter((card) => card.approach === approach).length}</span>
          </button>
        ))}
      </nav>
      <details className="deck-rules" open={rulesOpen} onToggle={(event) => setRulesOpen(event.currentTarget.open)}>
        <summary>需要时再看：成年牌局的完整规则</summary>
        <div className="deck-rules__grid">
          <section><b>牌力</b><p>你出牌后的进攻分。它会加上成长属性、克制、时代气候、组合和人生状态。最终得分高于世界强度，就能推进局面。</p></section>
          <section><b>守势</b><p>失手时的缓冲。心气损失等于双方分差减去守势，最少仍会损失 1 点。守势不增加你的得分。</p></section>
          <section><b>同型</b><p>你的做法与世界牌相同，双方正面对拼，不加不减。克制时 +2，受制时 −1。</p></section>
          <section><b>一场怎么赢</b><p>在规定轮数内把“局面推进”填到目标值。赢一轮至少推进 2，打平推进 1；输了不推进。</p></section>
        </div>
      </details>
      <div className="deck-families">
        {visibleApproaches.map((approach) => {
          const familyCards = state.cards.filter((card) => card.approach === approach && (activeApproach !== '已选' || state.selectedDeck.includes(card.id)));
          return (
            <section className={`deck-family deck-family--${APPROACH_CLASS[approach]}`} key={approach} aria-labelledby={`deck-family-${APPROACH_CLASS[approach]}`}>
              <header><div><ApproachMark approach={approach} /><h2 id={`deck-family-${APPROACH_CLASS[approach]}`}>{APPROACH_NOTE[approach]}</h2></div><span>{familyCards.length} 张记忆</span></header>
              {familyCards.length === 0 ? <p className="deck-family__empty">这一段成长里，你还没有留下属于「{approach}」的牌。</p> : <div className="deck-grid">
                {familyCards.map((card) => (
                <CardFace
                  key={card.id}
                  card={card}
                  selected={state.selectedDeck.includes(card.id)}
                  disabled={!state.selectedDeck.includes(card.id) && state.selectedDeck.length >= 8}
                  onClick={() => {
                    dispatch({ type: 'TOGGLE_DECK', cardId: card.id });
                    setSelectionNote(state.selectedDeck.includes(card.id) ? `已把「${card.title}」放回成长档案。` : `已把「${card.title}」带在身上。`);
                  }}
                  experience={state.cardExperience[card.id] ?? 0}
                  upgraded={state.upgradedCards.includes(card.id)}
                />
                ))}
              </div>}
            </section>
          );
        })}
      </div>
    </main>
  );
}

function EncounterScreen({ state, dispatch, endpoint }: {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]>;
  endpoint: string;
}) {
  const chapter = getChapter(state)!;
  const encounter = state.encounter!;
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState<0 | 1 | 2>(() => encounter.records.length === 1 ? 2 : 0);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const latest = encounter.records.at(-1);
  const handCards = encounter.hand.map((id) => state.cards.find((card) => card.id === id)!).filter(Boolean);
  const worldPower = getWorldPower(state) ?? encounter.currentIntent.power;
  const firstDuel = encounter.chapterIndex === 0 && encounter.records.length <= 1;
  const tutorialActive = firstDuel && !tutorialDismissed;
  const recommendedCard = handCards.reduce<LifeCard | null>((best, card) => {
    if (!best) return card;
    return previewCardPlay(state, card)!.playerScore > previewCardPlay(state, best)!.playerScore ? card : best;
  }, null);

  async function play(card: LifeCard) {
    if (pendingCard) return;
    if (tutorialActive && encounter.records.length === 0) setTutorialStep(2);
    setPendingCard(card.id);
    const text = await requestJudgeNarration(endpoint, {
      chapter: chapter.title,
      situation: chapter.premise,
      card: { title: card.title, memory: card.memory, approach: card.approach },
      intent: { title: encounter.currentIntent.title, text: encounter.currentIntent.text, approach: encounter.currentIntent.approach },
    });
    dispatch({ type: 'PLAY_CARD', cardId: card.id, judgeText: text ?? undefined });
    setPendingCard(null);
  }

  return (
    <main className={`encounter-screen ${tutorialActive ? `encounter-screen--tutorial-${tutorialStep}` : ''}`}>
      <header className="encounter-header">
        <div>
          <p className="eyebrow">世界牌局 {encounter.chapterIndex + 1} / {CHAPTERS.length} · {chapter.year} 岁</p>
          <h1>{chapter.title}</h1>
          <p>{chapter.location}</p>
        </div>
        <div className="progress-block">
          <div><span>局面推进</span><b>{Math.min(encounter.progress, chapter.target)} / {chapter.target}</b></div>
          <div className="progress-track"><i style={{ width: `${Math.min(100, (encounter.progress / chapter.target) * 100)}%` }} /></div>
          <small>第 {encounter.round} / {chapter.rounds} 轮</small>
        </div>
      </header>
      <section className="encounter-premise"><span>局面</span><p>{chapter.premise}</p></section>
      <section className="climate-line">
        <span>时代气候</span>
        <b>{encounter.climate.title}</b>
        <p>{encounter.climate.description}</p>
        {state.marks.length > 0 && <div className="mark-inline">{state.marks.map((mark) => <LifeMarkTag mark={mark} key={mark.id} />)}</div>}
      </section>
      {tutorialActive && tutorialStep === 0 && encounter.records.length === 0 && (
        <section className="duel-coach" aria-labelledby="duel-coach-title">
          <span>第一次上桌 · 第一步</span>
          <div><h2 id="duel-coach-title">先看世界出了什么</h2><p>右边暂时不用算。当前世界牌是 <ApproachMark approach={encounter.currentIntent.approach} />「{encounter.currentIntent.title}」，强度 <b>{worldPower}</b>。记住这两个信息就够了。</p></div>
          <div className="duel-coach__actions"><button className="text-button" onClick={() => setTutorialDismissed(true)}>跳过教学</button><button className="primary-button" onClick={() => setTutorialStep(1)}>去看我的手牌</button></div>
        </section>
      )}
      {tutorialActive && tutorialStep === 1 && encounter.records.length === 0 && recommendedCard && (
        <section className="duel-coach" aria-labelledby="duel-coach-title">
          <span>第一次上桌 · 第二步</span>
          <div><h2 id="duel-coach-title">先打一张有把握的牌</h2><p>我替你标出了「{recommendedCard.title}」。它预计能打出 <b>{previewCardPlay(state, recommendedCard)!.playerScore}</b> 分，对上世界的 <b>{worldPower}</b> 分。你可以按推荐出牌，也可以自己选。</p></div>
          <button className="text-button" onClick={() => setTutorialDismissed(true)}>我自己来</button>
        </section>
      )}
      {tutorialActive && tutorialStep === 2 && latest && (
        <section className="duel-coach duel-coach--result" aria-labelledby="duel-coach-title">
          <span>第一次上桌 · 第三步</span>
          <div><h2 id="duel-coach-title">先看结果，再学下一条</h2><p>这一轮是 <b>{latest.playerScore} 对 {latest.worldScore}</b>：{latest.outcome === 'win' ? '你推进了局面。' : latest.outcome === 'draw' ? '双方僵持，但仍推进了 1 点。' : '你没有推进，守势替你减少了心气损失。'} 接下来才需要留意换手、连招和详细加成。</p></div>
          <button className="primary-button" onClick={() => setTutorialDismissed(true)}>知道了，继续</button>
        </section>
      )}
      <div className="duel-layout">
        <section className={`world-card ${tutorialActive && tutorialStep === 0 ? 'world-card--spotlight' : ''}`} aria-label="世界打出的牌">
          <p className="eyebrow">世界打出</p>
          <ApproachMark approach={encounter.currentIntent.approach} />
          <h2>{encounter.currentIntent.title}</h2>
          <p>{encounter.currentIntent.text}</p>
          <blockquote>征兆：{encounter.currentIntent.tell}</blockquote>
          <div className="world-power">当前强度 <b>{worldPower}</b></div>
        </section>
        <section className={`hand-zone ${tutorialActive && tutorialStep === 0 ? 'hand-zone--waiting' : ''}`}>
          <div className="hand-zone__header">
            <div><p className="eyebrow">你的手牌</p><h2>这一次，你拿哪段自己来回答？</h2></div>
            {endpoint && <span className="judge-live">远程叙事裁判已接通</span>}
          </div>
          {latest && (
            <div className={`round-note round-note--${latest.outcome}`} aria-live="polite">
              <span>上一轮 · {latest.playerScore} : {latest.worldScore}</span>
              <p>{latest.text}</p>
              {latest.comboText && <b>{latest.comboText}</b>}
              {latest.masteredCard && <b>「{latest.masteredCard}」被反复使用，已淬炼：永久牌力 +1。</b>}
            </div>
          )}
          {(!tutorialActive || tutorialStep === 2) && (
            <div className="hand-tools">
              <span>连用同型：牌力 +1　/　三种做法各出一次：牌力 +3、压力 −1</span>
              <button className="text-button" disabled={encounter.redrawUsed || Boolean(pendingCard)} onClick={() => dispatch({ type: 'REDRAW_HAND' })}>
                {encounter.redrawUsed ? '本局已换过手' : `换一手${state.marks.some((mark) => mark.effect.kind === 'redraw') ? '（免费）' : '（压力 +1）'}`}
              </button>
            </div>
          )}
          <div className="hand-grid">
            {handCards.map((card) => {
              const preview = previewCardPlay(state, card)!;
              const relation = preview.relation;
              const prediction = preview.playerScore > preview.worldScore ? '可推进' : preview.playerScore === preview.worldScore ? '会僵持' : '会受挫';
              const recommended = tutorialActive && tutorialStep === 1 && recommendedCard?.id === card.id;
              return (
                <div className={`hand-option ${recommended ? 'hand-option--recommended' : ''}`} key={card.id}>
                  {recommended && <span className="recommended-stamp">建议先出这张</span>}
                  <CardFace
                    card={card}
                    compact
                    disabled={Boolean(pendingCard) || (tutorialActive && tutorialStep === 0)}
                    onClick={() => void play(card)}
                    experience={state.cardExperience[card.id] ?? 0}
                    upgraded={state.upgradedCards.includes(card.id)}
                  />
                  <span className={`relation relation--${relation}`}>
                    {relation === 'advantage' ? '克制 · 牌力 +2' : relation === 'disadvantage' ? '受制 · 牌力 −1' : '同型 · 正面对拼'}
                  </span>
                  <div className={`score-preview score-preview--${preview.playerScore > preview.worldScore ? 'win' : preview.playerScore === preview.worldScore ? 'draw' : 'loss'}`}>
                    <span>预计得分</span><b>{preview.playerScore}</b><i>对</i><b>{preview.worldScore}</b><em>{prediction}</em>
                  </div>
                  {(!tutorialActive || tutorialStep === 2) && (
                    <details className="score-breakdown">
                      <summary>得分怎样算出来？</summary>
                      <div>{preview.modifiers.map((modifier) => <span key={modifier.label}>{modifier.label}<b>{modifier.value >= 0 ? '+' : ''}{modifier.value}</b></span>)}</div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
          {pendingCard && <p className="judge-wait" role="status">裁判正在落笔…</p>}
        </section>
      </div>
    </main>
  );
}

function EncounterResultScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]> }) {
  const chapter = getChapter(state)!;
  const encounter = state.encounter!;
  const exhausted = state.resources.heart <= 0;
  const hasPendingLife = state.adultSchedule.some((slot) => slot.afterChapter === encounter.chapterIndex && !state.adultEventsResolved.includes(slot.eventId));
  const finalChapter = encounter.chapterIndex === CHAPTERS.length - 1;
  return (
    <main className="screen encounter-result">
      <AgeRail age={chapter.year} label="结案" />
      <section className="screen__body">
        <p className="eyebrow">{encounter.won ? '局面越过' : '局面未解'} · {encounter.progress} / {chapter.target}</p>
        <h1 className="display-title">{encounter.won ? '这一次，世界让了一步' : '你没有赢，但故事没有停'}</h1>
        <p className="lead">{encounter.won ? chapter.victory : chapter.setback}</p>
        <div className="round-ledger">
          {encounter.records.map((record, index) => (
            <div key={`${record.cardTitle}-${index}`}>
              <span>第 {index + 1} 轮</span>
              <b>{record.cardTitle}</b>
              <span>对 {record.intentTitle}</span>
              <strong>{record.playerScore} : {record.worldScore}</strong>
              <em>{record.outcome === 'win' ? '推进' : record.outcome === 'draw' ? '僵持' : '受挫'}</em>
            </div>
          ))}
        </div>
        {!finalChapter && !exhausted && <p className="recovery-note">进入下一场牌局前：基础恢复 2 点心气、降低 1 点压力；人生状态可能改变恢复量。</p>}
        <button className="primary-button" onClick={() => dispatch({ type: 'CONTINUE_ADVENTURE' })}>
          {exhausted ? '翻到人生档案末页' : hasPendingLife ? '离开牌桌，继续生活' : finalChapter ? '翻到人生档案末页' : `继续到 ${CHAPTERS[encounter.chapterIndex + 1]!.year} 岁`}
        </button>
      </section>
    </main>
  );
}

function AdultEventScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]> }) {
  const event = getAdultEvent(state)!;
  return (
    <main className="screen adult-event-screen">
      <AgeRail age={event.age} label={event.category} />
      <section className="screen__body">
        <div className="chapter-line"><span>成年生活事件</span><span>{state.adultEventsResolved.length + 1} / {state.adultSchedule.length}</span></div>
        <p className="eyebrow">{event.category} · {event.age} 岁</p>
        <h1 className="display-title">{event.title}</h1>
        <p className="story-text">{event.text}</p>
        <p className="story-question">{event.question}</p>
        {state.marks.length > 0 && (
          <div className="life-state-box">
            <span>你正带着</span>
            {state.marks.map((mark) => <LifeMarkTag mark={mark} verbose key={mark.id} />)}
          </div>
        )}
        <div className="adult-choice-list">
          {event.choices.map((choice, index) => {
            const available = canChooseAdultChoice(state, choice);
            return (
              <button className="adult-choice" disabled={!available} key={choice.id} onClick={() => dispatch({ type: 'CHOOSE_ADULT_EVENT', choiceId: choice.id })}>
                <span className="choice__key">{String.fromCharCode(65 + index)}</span>
                <span className="choice__copy"><b>{choice.verb}</b><small>{choice.detail}</small></span>
                <span className="adult-choice__effects">
                  {(Object.entries(choice.changes) as Array<[ResourceKey, number]>).map(([key, value]) => (
                    <i className={resourceDeltaTone(key, value)} key={key}>{resourceDeltaLabel(key, value)}</i>
                  ))}
                  {choice.mark && <i className="status-effect">获得「{choice.mark.title}」</i>}
                  {choice.upgradeCard && <i className="status-effect">淬炼一张随机随身牌</i>}
                  {!available && choice.requirement && <i className="requirement">{choice.requirement.text}</i>}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function AdultResultScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]> }) {
  const event = getAdultEvent(state)!;
  const result = state.adultEventResult!;
  const upgradedCard = result.upgradedCardId ? state.cards.find((card) => card.id === result.upgradedCardId) : null;
  return (
    <main className="screen adult-result-screen">
      <AgeRail age={event.age} label="生活继续" />
      <section className="screen__body adult-result-layout">
        <div>
          <p className="eyebrow">选择已写入成年档案</p>
          <h1 className="display-title">你选择了：{result.choice}</h1>
          <p className="lead">{result.outcome}</p>
          <div className="resource-delta-row">
            {(Object.entries(result.changes) as Array<[ResourceKey, number]>).map(([key, value]) => (
              <span className={resourceDeltaTone(key, value)} key={key}>{resourceDeltaLabel(key, value)}</span>
            ))}
          </div>
          {result.mark && (
            <div className={`gained-mark gained-mark--${result.mark.tone}`}>
              <span>新的人生状态</span><b>{result.mark.title}</b><p>{result.mark.description}</p>
            </div>
          )}
          <button className="primary-button" onClick={() => dispatch({ type: 'CONTINUE_ADULT_EVENT' })}>继续往下生活</button>
        </div>
        {upgradedCard && (
          <div className="acquired-card">
            <p className="eyebrow">一段旧记忆被重新理解</p>
            <CardFace card={upgradedCard} upgraded experience={state.cardExperience[upgradedCard.id] ?? 0} />
          </div>
        )}
      </section>
    </main>
  );
}

function EndingScreen({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]> }) {
  const ending = state.ending!;
  const wins = state.chapterResults.filter(Boolean).length;
  return (
    <main className="ending-screen">
      <p className="eyebrow">人生档案 · 暂时结卷</p>
      <div className="ending-mark" aria-hidden="true">完</div>
      <h1>{ending.title}</h1>
      <p className="ending-kicker">{ending.kicker}</p>
      <p className="ending-text">{ending.text}</p>
      <blockquote>{ending.postscript}</blockquote>
      <dl className="ending-stats">
        <div><dt>越过局面</dt><dd>{wins} / {state.chapterResults.length}</dd></div>
        <div><dt>洞察</dt><dd>{state.traits.insight}</dd></div>
        <div><dt>行动</dt><dd>{state.traits.nerve}</dd></div>
        <div><dt>共情</dt><dd>{state.traits.empathy}</dd></div>
        <div><dt>留下的牌</dt><dd>{state.cards.length}</dd></div>
        <div><dt>成年事件</dt><dd>{state.adultEventsResolved.length}</dd></div>
        <div><dt>淬炼牌</dt><dd>{state.upgradedCards.length}</dd></div>
      </dl>
      {state.marks.length > 0 && (
        <section className="ending-marks">
          <p className="eyebrow">带到最后的人生状态</p>
          <div>{state.marks.map((mark) => <LifeMarkTag mark={mark} key={mark.id} />)}</div>
        </section>
      )}
      <div className="ending-actions">
        <button className="text-button" onClick={() => window.print()}>打印这份人生档案</button>
        <button className="primary-button" onClick={() => dispatch({ type: 'RESTART' })}>再活一次</button>
      </div>
    </main>
  );
}

function DialogShell({ children, className, labelledBy, onClose }: { children: ReactNode; className: string; labelledBy: string; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => {
      const preferred = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]');
      (preferred ?? panelRef.current)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), summary, [tabindex]:not([tabindex="-1"])'));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="guide-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={panelRef} className={className} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
        {children}
      </section>
    </div>
  );
}

function GameGuide({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell className="game-guide" labelledBy="game-guide-title" onClose={onClose}>
        <header><div><p className="eyebrow">随时可查 · 完整规则</p><h2 id="game-guide-title">怎样玩《浮生牌局》</h2></div><button data-autofocus onClick={onClose} aria-label="关闭玩法说明">关闭</button></header>
        <div className="guide-flow" aria-label="游戏流程">
          <span><b>4–17 岁</b>选择成长，获得记忆牌并承担随机代价</span>
          <span><b>18 岁</b>从 15 张记忆里挑 8 张随身牌</span>
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
          <h3>进阶机制</h3>
          <ul>
            <li>连续使用同一种做法：触发“惯用手”，本轮 +1。</li>
            <li>最近三轮恰好包含三种做法：触发“三式合流”，本轮 +3、压力 −1。</li>
            <li>同一张牌累计使用两次：完成淬炼，此后永久牌力 +1。</li>
            <li>每场可换手一次，通常压力 +1；时代气候和人生状态会继续修改规则。</li>
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

function Journal({ state }: { state: GameState }) {
  return (
    <details className="journal">
      <summary>人生档案 <span>{state.journal.length} 条</span></summary>
      <div className="journal__entries">
        {state.journal.map((entry, index) => (
          <article className={`journal-entry journal-entry--${entry.tone ?? 'plain'}`} key={`${entry.stamp}-${index}`}>
            <span>{entry.stamp}</span><h3>{entry.title}</h3><p>{entry.body}</p>
          </article>
        ))}
      </div>
    </details>
  );
}

function AppHeader({ state, onReset, onGuide, endpoint, setEndpoint }: {
  state: GameState;
  onReset: () => void;
  onGuide: () => void;
  endpoint: string;
  setEndpoint: (value: string) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    setDeveloperOpen(false);
  }, []);

  async function testJudge() {
    if (!endpoint.trim()) return;
    setTestState('testing');
    const text = await requestJudgeNarration(endpoint, {
      chapter: '连接测试', situation: '玩家第一次接通叙事裁判。',
      card: { title: '普通人的底牌', memory: '没有天赋加成，也可以把日子一张张攒起来。', approach: '共情' },
      intent: { title: '未知的明天', text: '世界没有提前给出答案。', approach: '行动' },
    });
    setTestState(text ? 'success' : 'failure');
  }

  return (
    <>
      <header className="app-header">
        <div className="wordmark">浮生牌局 <span>FL/{state.origin?.serial ?? '未登记'}</span></div>
        <ResourceStrip state={state} />
        <div className="header-actions">
          <button onClick={onGuide}>玩法说明</button>
          <button aria-expanded={settingsOpen} onClick={() => setSettingsOpen(true)}>设置</button>
          <button onClick={onReset}>重开</button>
        </div>
        <button className="mobile-menu-button" aria-expanded={mobileMenuOpen} aria-controls="mobile-game-menu" onClick={() => setMobileMenuOpen(true)}>菜单</button>
      </header>
      {mobileMenuOpen && (
        <DialogShell className="mobile-menu" labelledBy="mobile-menu-title" onClose={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu__handle" aria-hidden="true" />
          <header>
            <div><p className="eyebrow">局内操作</p><h2 id="mobile-menu-title">浮生牌局</h2></div>
            <button className="mobile-menu__close" data-autofocus onClick={() => setMobileMenuOpen(false)} aria-label="关闭菜单">关闭</button>
          </header>
          <div className="mobile-menu__actions" id="mobile-game-menu">
            <button onClick={() => { setMobileMenuOpen(false); onGuide(); }}><b>玩法说明</b><span>流程、牌力、同型与 LLM 用法</span></button>
            <button onClick={() => { setMobileMenuOpen(false); setSettingsOpen(true); }}><b>叙事设置</b><span>{endpoint ? '自定义叙事已配置' : '当前使用离线叙事'}</span></button>
            <button className="mobile-menu__danger" onClick={() => { setMobileMenuOpen(false); onReset(); }}><b>重开人生</b><span>清除这一次的人生进度</span></button>
          </div>
        </DialogShell>
      )}
      {settingsOpen && (
        <DialogShell className="settings-panel" labelledBy="settings-title" onClose={closeSettings}>
          <header className="settings-header"><div><p className="eyebrow">游戏设置</p><h2 id="settings-title">叙事方式</h2></div><button data-autofocus onClick={closeSettings} aria-label="关闭设置">关闭</button></header>
          <section className="narration-status" aria-live="polite">
            <span>{endpoint ? '自定义叙事已配置' : '默认 · 离线叙事'}</span>
            <b>{endpoint ? '每次出牌会尝试请求自定义裁判' : '无需联网，也不会上传你的游戏内容'}</b>
            <p>{endpoint ? '若连接失败，游戏会立即使用内置文案，胜负和随机结果始终由本地规则决定。' : '游戏当前使用内置裁判文案。LLM 只是可选的文字扩展，不影响牌力、抽牌或胜负。'}</p>
          </section>
          <details className="developer-settings" open={developerOpen} onToggle={(event) => setDeveloperOpen(event.currentTarget.open)}>
            <summary>开发者接入：连接 LLM 叙事裁判</summary>
            <div className="developer-settings__body">
              <ol className="judge-steps">
                <li><b>启动安全中转。</b>在另一个终端配置模型环境变量，再运行 <code>npm run judge</code>。</li>
                <li><b>填写地址。</b>本地示例为 <code>http://localhost:8787/judge</code>，也可使用自己部署的兼容端点。</li>
                <li><b>测试连接。</b>连接成功后，每次出牌会请求一段专属叙述；失败时自动回到内置文案。</li>
              </ol>
              <label>
                <span>中转端点 URL</span>
                <input type="url" value={endpoint} onChange={(event) => { setEndpoint(event.target.value); setTestState('idle'); }} placeholder="http://localhost:8787/judge" />
              </label>
              <div className="judge-test-row">
                <button className="primary-button" disabled={!endpoint.trim() || testState === 'testing'} onClick={() => void testJudge()}>{testState === 'testing' ? '正在测试…' : '测试端点'}</button>
                <span className={`judge-test judge-test--${testState}`} aria-live="polite">
                  {testState === 'success' ? '连接成功，远程叙事已启用。' : testState === 'failure' ? '没有收到有效文字。检查中转服务、模型配置与地址。' : endpoint ? '尚未测试。' : '尚未填写自定义端点。'}
                </span>
              </div>
              <details className="endpoint-contract"><summary>自定义端点的数据格式</summary><p>接受游戏发送的 JSON POST，并返回 <code>{'{ "text": "不超过 70 个汉字的叙述" }'}</code>。完整示例见 <code>docs/LLM_JUDGE.md</code>。</p></details>
              <p className="security-note">模型密钥只能放在中转服务的环境变量中，绝不要填进这个页面。LLM 只写叙述，本地规则仍负责全部胜负。</p>
            </div>
          </details>
          <button className="primary-button settings-done" onClick={closeSettings}>保存并回到人生</button>
        </DialogShell>
      )}
    </>
  );
}

export function App() {
  const [state, dispatch] = useReducer(reduceGame, undefined, initialState);
  const [endpoint, setEndpointState] = useState(() => localStorage.getItem('floating-life-cards.judge-endpoint') ?? '');
  const [guideOpen, setGuideOpen] = useState(false);
  const showChrome = state.phase !== 'title';
  const showJournal = showChrome && state.journal.length > 0
    && !(state.phase === 'deck' || (state.phase === 'encounter' && state.encounter?.chapterIndex === 0 && state.encounter.records.length <= 1));
  const openGuide = useCallback(() => setGuideOpen(true), []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  useEffect(() => saveGame(state), [state]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.phase]);

  function setEndpoint(value: string) {
    setEndpointState(value);
    localStorage.setItem('floating-life-cards.judge-endpoint', value);
  }

  function reset() {
    if (!window.confirm('确定重开吗？当前人生档案会被覆盖。')) return;
    clearSave();
    dispatch({ type: 'RESTART' });
  }

  return (
    <div className={`app app--${state.phase}`}>
      <a className="skip-link" href="#game-content">跳到游戏内容</a>
      {showChrome && <AppHeader state={state} onReset={reset} onGuide={openGuide} endpoint={endpoint} setEndpoint={setEndpoint} />}
      <div id="game-content">
        {state.phase === 'title' && <TitleScreen onStart={() => dispatch({ type: 'BEGIN' })} onGuide={openGuide} />}
        {state.phase === 'origin' && <OriginScreen state={state} dispatch={dispatch} />}
        {state.phase === 'growth' && <GrowthScreen state={state} dispatch={dispatch} />}
        {state.phase === 'growth-result' && <GrowthResultScreen state={state} dispatch={dispatch} />}
        {state.phase === 'deck' && <DeckScreen state={state} dispatch={dispatch} />}
        {state.phase === 'encounter' && <EncounterScreen state={state} dispatch={dispatch} endpoint={endpoint} />}
        {state.phase === 'encounter-result' && <EncounterResultScreen state={state} dispatch={dispatch} />}
        {state.phase === 'adult-event' && <AdultEventScreen state={state} dispatch={dispatch} />}
        {state.phase === 'adult-result' && <AdultResultScreen state={state} dispatch={dispatch} />}
        {state.phase === 'ending' && <EndingScreen state={state} dispatch={dispatch} />}
      </div>
      {showJournal && <Journal state={state} />}
      {guideOpen && <GameGuide onClose={closeGuide} />}
    </div>
  );
}
