import { AgeRail } from '../components/AgeRail';
import { LifeMarkTag } from '../components/LifeMarkTag';
import { SceneArt } from '../components/SceneArt';
import { MemoryEchoPanel } from '../components/MemoryEchoPanel';
import { canChooseAdultChoice, getAdultChoiceBlockReason, getAdultChoices, getAdultEvent } from '../game/game';
import { resourceDeltaLabel, resourceDeltaTone } from '../game/presentation';
import { getAdultEventSceneVisual } from '../game/visuals';
import type { Dispatch } from 'react';
import type { GameAction, GameState, ResourceKey } from '../game/types';

export function AdultEventScreen({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const event = getAdultEvent(state)!;
  const choices = getAdultChoices(state);
  const visual = getAdultEventSceneVisual(event.id, event.age, event.title);
  return (
    <main className="screen adult-event-screen">
      <AgeRail age={event.age} label={event.category} />
      <section className="screen__body">
        <SceneArt visual={visual} />
        <div className="chapter-line"><span>成年生活事件</span><span>{state.adultEventsResolved.length + 1} / {state.adultSchedule.length}</span></div>
        <h1 className="display-title">{event.title}</h1>
        <p className="story-text">{event.text}</p>
        <p className="story-question">{event.question}</p>
        <MemoryEchoPanel state={state} echo={event.echo} />
        {state.marks.length > 0 && (
          <div className="life-state-box">
            <span>你正带着</span>
            {state.marks.map((mark) => <LifeMarkTag mark={mark} verbose key={mark.id} />)}
          </div>
        )}
        <div className="adult-choice-list">
          {choices.map((choice) => {
            const available = canChooseAdultChoice(state, choice);
            const blockReason = getAdultChoiceBlockReason(state, choice);
            return (
              <button className="adult-choice" disabled={!available} key={choice.id} onClick={() => dispatch({ type: 'CHOOSE_ADULT_EVENT', choiceId: choice.id })}>
                <span className="choice__copy"><b>{choice.verb}</b><small>{choice.detail}</small></span>
                <span className="adult-choice__effects">
                  {(Object.entries(choice.changes) as Array<[ResourceKey, number]>).map(([key, value]) => (
                    <i className={resourceDeltaTone(key, value)} key={key}>{resourceDeltaLabel(key, value)}</i>
                  ))}
                  {choice.mark && <i className="status-effect">获得「{choice.mark.title}」</i>}
                  {choice.upgradeCard && <i className="status-effect">淬炼一张随机随身牌</i>}
                  {choice.upgradeMemoryAge !== undefined && <i className="status-effect">重新理解 {choice.upgradeMemoryAge} 岁的记忆</i>}
                  {choice.memoryRequirement && available && <i className="memory-unlock">来自你曾经做过的选择</i>}
                  {!available && blockReason && <i className="requirement">{blockReason}</i>}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
