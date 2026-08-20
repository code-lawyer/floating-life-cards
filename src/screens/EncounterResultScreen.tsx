import { useState } from 'react';
import { AgeRail } from '../components/AgeRail';
import { SceneArt } from '../components/SceneArt';
import { CHAPTERS } from '../game/content';
import { getChapter, reduceGame } from '../game/game';
import { getStartingIdentity } from '../game/identities';
import { formatPrototypePlaytestRecord } from '../game/playtestRecord';
import { getChapterResultSceneVisual } from '../game/visuals';
import type { GameState } from '../game/types';

export function EncounterResultScreen({ state, dispatch, onExitPrototype }: {
  state: GameState;
  dispatch: React.Dispatch<Parameters<typeof reduceGame>[1]>;
  onExitPrototype: () => void;
}) {
  const [recordCopyStatus, setRecordCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const chapter = getChapter(state)!;
  const chapterVisual = getChapterResultSceneVisual(chapter.id, chapter.title);
  const encounter = state.encounter!;
  const identity = getStartingIdentity(state.startingIdentity);
  const playtestRecord = formatPrototypePlaytestRecord(state);
  const exhausted = state.resources.heart <= 0;
  const hasPendingLife = state.adultSchedule.some((slot) => slot.afterChapter === encounter.chapterIndex && !state.adultEventsResolved.includes(slot.eventId));
  const finalChapter = encounter.chapterIndex === CHAPTERS.length - 1;

  async function copyPlaytestRecord() {
    if (!playtestRecord || !navigator.clipboard) {
      setRecordCopyStatus('failed');
      return;
    }
    try {
      await navigator.clipboard.writeText(playtestRecord);
      setRecordCopyStatus('copied');
    } catch {
      setRecordCopyStatus('failed');
    }
  }

  return (
    <main className="screen encounter-result">
      <AgeRail age={chapter.year} label="结案" />
      <section className="screen__body">
        <SceneArt visual={chapterVisual} className="scene-art--result" />
        <p className="eyebrow">{encounter.won ? '局面越过' : '局面未解'} · {encounter.progress} / {chapter.target}</p>
        <h1 className="display-title">{encounter.won ? '这一次，世界让了一步' : '你没有赢，但故事没有停'}</h1>
        <p className="lead">{encounter.won ? chapter.victory : chapter.setback}</p>
        <div className="round-ledger">
          {encounter.records.map((record, index) => (
            <div key={`${record.cardTitle}-${index}`}>
              <span>第 {index + 1} 轮</span><b>{record.cardTitle}</b><span>对 {record.intentTitle}</span>
              <strong>{record.playerScore} : {record.worldScore}</strong>
              <em>{record.outcome === 'win' ? '推进' : record.outcome === 'draw' ? '僵持' : '受挫'}</em>
            </div>
          ))}
        </div>
        {state.mode === 'prototype' && identity ? (
          <div className="prototype-result-actions">
            <p>制作原型使用固定种子与牌组；重新开始后，唯一变量仍是你的出牌选择。</p>
            <button className="primary-button" onClick={() => dispatch({ type: 'RESTART_PROTOTYPE' })}>用{identity.title}再试一次</button>
            <button className="text-button" onClick={() => void copyPlaytestRecord()}>复制本局试玩记录</button>
            {playtestRecord && (
              <a className="text-button download-link" download={`浮生牌局-${identity.title}-试玩记录.md`}
                href={`data:text/markdown;charset=utf-8,${encodeURIComponent(playtestRecord)}`}>下载本局试玩记录</a>
            )}
            <button className="text-button" onClick={onExitPrototype}>返回标题，换一个身份</button>
            {recordCopyStatus !== 'idle' && (
              <p role="status">{recordCopyStatus === 'copied'
                ? '本局记录已复制，可粘贴到试玩模板。'
                : '未能访问剪贴板，请允许浏览器复制权限后重试。'}</p>
            )}
          </div>
        ) : (
          <>
            {!finalChapter && !exhausted && <p className="recovery-note">进入下一场牌局前：基础恢复 2 点心气、降低 1 点压力；人生状态可能改变恢复量。</p>}
            <button className="primary-button" onClick={() => dispatch({ type: 'CONTINUE_ADVENTURE' })}>
              {exhausted ? '翻到人生档案末页' : hasPendingLife ? '离开牌桌，继续生活' : finalChapter ? '翻到人生档案末页' : `继续到 ${CHAPTERS[encounter.chapterIndex + 1]!.year} 岁`}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
