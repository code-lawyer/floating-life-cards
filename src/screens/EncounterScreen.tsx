import { useEffect, useRef, useState } from 'react';
import { ApproachMark } from '../components/ApproachMark';
import { DuelCoach } from '../components/DuelCoach';
import { HandOption } from '../components/HandOption';
import { LifeMarkTag } from '../components/LifeMarkTag';
import { SceneArt } from '../components/SceneArt';
import { CHAPTERS } from '../game/content';
import { getChapter, getRedrawPressureCost, getWorldPower, previewCardPlay } from '../game/game';
import { getStartingIdentity } from '../game/identities';
import { requestJudgeNarration } from '../game/judge';
import { getChapterSceneVisual } from '../game/visuals';
import type { Dispatch } from 'react';
import type { EncounterState, GameAction, GameState, LifeCard } from '../game/types';

export function EncounterScreen({ state, dispatch, endpoint }: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  endpoint: string;
}) {
  const chapter = getChapter(state)!;
  const encounter = state.encounter!;
  const identity = getStartingIdentity(state.startingIdentity);
  const chapterVisual = getChapterSceneVisual(chapter.id, chapter.title);
  const [pendingPlay, setPendingPlay] = useState<{ cardId: string; encounter: EncounterState } | null>(null);
  const pendingRequest = useRef<{ controller: AbortController; encounter: EncounterState } | null>(null);
  const pendingCard = pendingPlay?.encounter === encounter ? pendingPlay.cardId : null;
  const [tutorialStep, setTutorialStep] = useState<0 | 1 | 2>(() => encounter.records.length === 1 ? 2 : 0);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const handZoneRef = useRef<HTMLElement | null>(null);
  const latest = encounter.records.at(-1);
  const handCards = encounter.hand.map((id) => state.cards.find((card) => card.id === id)!).filter(Boolean);
  const memoryCards = encounter.memoryPile.map((id) => state.cards.find((card) => card.id === id)!).filter(Boolean);
  const warmthCard = encounter.warmthCardId ? state.cards.find((card) => card.id === encounter.warmthCardId) ?? null : null;
  const worldPower = getWorldPower(state) ?? encounter.currentIntent.power;
  const firstDuel = encounter.chapterIndex === 0 && encounter.records.length <= 1;
  const tutorialActive = firstDuel && !tutorialDismissed;
  const showingHandTutorial = tutorialActive && tutorialStep === 1 && encounter.records.length === 0;
  /** 教学结束前只暴露最小操作面；换手、余温与逐项加成都等第三步再出现。 */
  const showFullTools = !tutorialActive || tutorialStep === 2;

  useEffect(() => () => {
    // 重开会卸载页面；任何牌局状态变化也让上一份请求上下文失效。
    const request = pendingRequest.current;
    if (request?.encounter !== encounter) return;
    request.controller.abort();
    pendingRequest.current = null;
  }, [encounter]);

  useEffect(() => {
    if (!showingHandTutorial || !handZoneRef.current) return;
    const handZone = handZoneRef.current;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    handZone.focus({ preventScroll: true });
    handZone.scrollIntoView?.({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }, [showingHandTutorial]);

  const recommendedCard = handCards.reduce<LifeCard | null>((best, card) => {
    if (!best) return card;
    return previewCardPlay(state, card)!.playerScore > previewCardPlay(state, best)!.playerScore ? card : best;
  }, null);

  async function play(card: LifeCard) {
    if (pendingRequest.current) return;
    const request = { controller: new AbortController(), encounter };
    pendingRequest.current = request;
    if (tutorialActive && encounter.records.length === 0) setTutorialStep(2);
    setPendingPlay({ cardId: card.id, encounter });
    const text = await requestJudgeNarration(endpoint, {
      chapter: chapter.title,
      situation: chapter.premise,
      card: { title: card.title, memory: card.memory, approach: card.approach },
      intent: { title: encounter.currentIntent.title, text: encounter.currentIntent.text, approach: encounter.currentIntent.approach },
    }, request.controller.signal);
    // 即使 fetch 已完成或忽略取消，也不允许旧局的结果提交到新局。
    if (request.controller.signal.aborted || pendingRequest.current !== request) return;
    pendingRequest.current = null;
    setPendingPlay(null);
    dispatch({ type: 'PLAY_CARD', cardId: card.id, judgeText: text ?? undefined });
  }

  return (
    <main className={`encounter-screen ${tutorialActive ? `encounter-screen--tutorial-${tutorialStep}` : ''}`}>
      <SceneArt visual={chapterVisual} className="scene-art--encounter" />
      <header className="encounter-header">
        <div>
          <p className="eyebrow">世界牌局 {encounter.chapterIndex + 1} / {CHAPTERS.length} · {chapter.year} 岁</p>
          <h1>{chapter.title}</h1>
          <p>{chapter.location}</p>
        </div>
        <div className="progress-block">
          <div><span>局面推进</span><b>{Math.min(encounter.progress, chapter.target)} / {chapter.target}</b></div>
          <div className="progress-track"><i style={{ transform: `scaleX(${Math.min(1, encounter.progress / chapter.target)})` }} /></div>
          <small>第 {encounter.round} / {chapter.rounds} 轮</small>
        </div>
      </header>
      <section className="encounter-premise"><span>局面</span><p>{chapter.premise}</p></section>
      <details className="encounter-context">
        <summary>
          <span>本轮背景</span>
          <b>{identity?.title ?? '普通人'}{chapter.rule ? ` · ${chapter.rule.title}` : ''}{state.mode === 'story' ? ` · ${encounter.climate.title}` : ''}</b>
          <i>展开查看修正</i>
        </summary>
        <div className="encounter-context__body">
          {identity && (
            <section className="identity-line" aria-label="起手身份">
              <span>起手身份</span><b>{identity.title}</b><p>{identity.passiveText}</p>
            </section>
          )}
          {state.mode === 'prototype' && (
            <section className="identity-line" aria-label="永久记忆规则">
              <span>永久记忆</span><b>牌不会被消耗</b>
              <p>每场结束后全部记忆回到应对组；童年余温只是在本场提前找回一张已经用过的牌。</p>
            </section>
          )}
          {chapter.rule && (
            <section className="encounter-rule" aria-label="本局规则">
              <span>本局规则</span><b>{chapter.rule.title}</b><p>{chapter.rule.description}</p>
            </section>
          )}
          {state.mode === 'story' && (
            <section className="climate-line">
              <span>时代气候</span><b>{encounter.climate.title}</b><p>{encounter.climate.description}</p>
              {state.marks.length > 0 && <div className="mark-inline">{state.marks.map((mark) => <LifeMarkTag mark={mark} key={mark.id} />)}</div>}
            </section>
          )}
        </div>
      </details>
      {tutorialActive && tutorialStep === 0 && encounter.records.length === 0 && (
        <DuelCoach
          step={0}
          intent={encounter.currentIntent}
          worldPower={worldPower}
          onSkip={() => setTutorialDismissed(true)}
          onNext={() => setTutorialStep(1)}
        />
      )}
      {showingHandTutorial && recommendedCard && (
        <DuelCoach
          step={1}
          cardTitle={recommendedCard.title}
          playerScore={previewCardPlay(state, recommendedCard)!.playerScore}
          worldPower={worldPower}
          onSkip={() => setTutorialDismissed(true)}
        />
      )}
      {tutorialActive && tutorialStep === 2 && latest && (
        <DuelCoach step={2} record={latest} onDismiss={() => setTutorialDismissed(true)} />
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
        <section ref={handZoneRef} className={`hand-zone ${tutorialActive && tutorialStep === 0 ? 'hand-zone--waiting' : ''}`} aria-labelledby="hand-zone-title" tabIndex={-1}>
          <div className="hand-zone__header">
            <div><p className="eyebrow">你的手牌</p><h2 id="hand-zone-title">这一次，你拿哪段自己来回答？</h2></div>
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
          {showFullTools && (
            <div className="hand-tools">
              <span>连用同型：牌力 +1　/　三种做法各出一次：牌力 +3、压力 −1</span>
              <button className="text-button" disabled={encounter.redrawUsed || Boolean(pendingCard)} onClick={() => dispatch({ type: 'REDRAW_HAND' })}>
                {encounter.redrawUsed ? '本局已换过手' : `换一手${getRedrawPressureCost(state) === 0 ? '（免费）' : `（压力 +${getRedrawPressureCost(state)}）`}`}
              </button>
            </div>
          )}
          {showFullTools && (encounter.warmthUsed || memoryCards.length > 0) && (
            <section className="warmth-tool" aria-label="童年余温">
              <div>
                <b>童年余温</b>
                <span>每场一次：从本场已经用过的回忆堆找回一张牌，压力 −1；牌本身不会永久消失。</span>
              </div>
              {encounter.warmthUsed ? (
                <div className="warmth-tool__recalled" role="status">
                  <strong>童年余温已用</strong>
                  {warmthCard && (
                    <p>
                      <b>「{warmthCard.title}」· {typeof warmthCard.originAge === 'number' ? `${warmthCard.originAge} 岁` : `${warmthCard.originAge}牌`}</b>
                      <span>{warmthCard.memory}</span>
                    </p>
                  )}
                </div>
              ) : memoryCards.length > 0 ? (
                <div className="warmth-tool__cards">
                  {memoryCards.map((card) => (
                    <button
                      className="text-button"
                      disabled={Boolean(pendingCard)}
                      onClick={() => dispatch({ type: 'RECALL_MEMORY', cardId: card.id })}
                      key={card.id}
                      aria-label={`召回「${card.title}」`}
                    >
                      召回「{card.title}」
                    </button>
                  ))}
                </div>
              ) : (
                <span>打出一张牌后，就能从回忆堆找回它。</span>
              )}
            </section>
          )}
          <div className="hand-grid">
            {handCards.map((card) => (
              <HandOption
                key={card.id}
                card={card}
                preview={previewCardPlay(state, card)!}
                recommended={tutorialActive && tutorialStep === 1 && recommendedCard?.id === card.id}
                disabled={Boolean(pendingCard) || (tutorialActive && tutorialStep === 0)}
                experience={state.cardExperience[card.id] ?? 0}
                upgraded={state.upgradedCards.includes(card.id)}
                showBreakdown={showFullTools}
                onPlay={() => void play(card)}
              />
            ))}
            {handCards.length === 0 && <p className="hand-grid__empty" role="status">这一轮没有可用记忆牌。请换一手，或返回标题重新开始。</p>}
          </div>
          {pendingCard && <p className="judge-wait" role="status">裁判正在落笔…</p>}
        </section>
      </div>
    </main>
  );
}
