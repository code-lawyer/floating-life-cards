import { useCallback, useEffect, useReducer, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { GameGuide } from './components/GameGuide';
import { Journal } from './components/Journal';
import { createGame, reduceGame } from './game/game';
import { clearSave, loadGame, saveGame } from './game/persistence';
import { AdultEventScreen } from './screens/AdultEventScreen';
import { AdultResultScreen } from './screens/AdultResultScreen';
import { DeckScreen } from './screens/DeckScreen';
import { EncounterResultScreen } from './screens/EncounterResultScreen';
import { EncounterScreen } from './screens/EncounterScreen';
import { EndingScreen } from './screens/EndingScreen';
import { GrowthResultScreen } from './screens/GrowthResultScreen';
import { GrowthScreen } from './screens/GrowthScreen';
import { IdentityScreen } from './screens/IdentityScreen';
import { InterludeScreen } from './screens/InterludeScreen';
import { OriginScreen } from './screens/OriginScreen';
import { TitleScreen } from './screens/TitleScreen';
import type { GameState } from './game/types';

const JUDGE_ENDPOINT_KEY = 'floating-life-cards.judge-endpoint';

/** 阶段1成人原型使用专用地址，绑定独立存档槽，不读写正式故事。 */
function isAdultPrototypePlaytest(): boolean {
  return new URLSearchParams(window.location.search).get('playtest') === 'adult-prototype';
}

function initialState(): GameState {
  const playtest = isAdultPrototypePlaytest();
  return loadGame(playtest ? 'prototype' : 'story') ?? createGame();
}

function loadJudgeEndpoint(): string {
  try {
    return localStorage.getItem(JUDGE_ENDPOINT_KEY) ?? '';
  } catch {
    return '';
  }
}

function persistJudgeEndpoint(value: string): void {
  try {
    localStorage.setItem(JUDGE_ENDPOINT_KEY, value);
  } catch {
    // 自定义裁判是可选增强；存储受限时仍保留当前会话内的设置。
  }
}

export function App() {
  const [state, dispatch] = useReducer(reduceGame, undefined, initialState);
  const [endpoint, setEndpointState] = useState(loadJudgeEndpoint);
  const [guideOpen, setGuideOpen] = useState(false);
  const showChrome = state.phase !== 'title';
  const adultPrototypePlaytest = isAdultPrototypePlaytest();
  const showJournal = showChrome && state.journal.length > 0
    && !(state.phase === 'deck' || state.phase === 'interlude' || (state.phase === 'encounter' && state.encounter?.chapterIndex === 0 && state.encounter.records.length <= 1));
  const openGuide = useCallback(() => setGuideOpen(true), []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  useEffect(() => {
    if (adultPrototypePlaytest && state.mode === 'story' && state.phase === 'title') return;
    saveGame(state);
  }, [adultPrototypePlaytest, state]);

  useEffect(() => {
    // 阶段切换时回到页首；依赖在这里是触发器，副作用本身不读取它。
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.phase]);

  function setEndpoint(value: string) {
    setEndpointState(value);
    persistJudgeEndpoint(value);
  }

  function restart() {
    dispatch({ type: 'RESTART', seed: (Date.now() ^ state.rng) >>> 0 });
  }

  function reset() {
    if (!window.confirm('确定重开吗？当前人生档案会被覆盖。')) return;
    clearSave(state.mode);
    restart();
  }

  function exitPrototype() {
    clearSave('prototype');
    dispatch({ type: 'RESTART', seed: state.seed });
  }

  return (
    <div className={`app app--${state.phase}`}>
      <a className="skip-link" href="#game-content">跳到游戏内容</a>
      {showChrome && <AppHeader state={state} onReset={reset} onGuide={openGuide} endpoint={endpoint} setEndpoint={setEndpoint} />}
      <div id="game-content">
        {state.phase === 'title' && <TitleScreen playtestOnly={adultPrototypePlaytest} onStart={() => dispatch({ type: 'BEGIN' })} onGuide={openGuide} onPrototype={(identityId) => dispatch({ type: 'START_PROTOTYPE', identityId })} />}
        {state.phase === 'origin' && <OriginScreen state={state} dispatch={dispatch} />}
        {state.phase === 'growth' && <GrowthScreen state={state} dispatch={dispatch} />}
        {state.phase === 'growth-result' && <GrowthResultScreen state={state} dispatch={dispatch} />}
        {state.phase === 'deck' && <DeckScreen state={state} dispatch={dispatch} />}
        {state.phase === 'identity' && <IdentityScreen state={state} dispatch={dispatch} />}
        {state.phase === 'interlude' && <InterludeScreen state={state} dispatch={dispatch} />}
        {state.phase === 'encounter' && <EncounterScreen state={state} dispatch={dispatch} endpoint={endpoint} />}
        {state.phase === 'encounter-result' && <EncounterResultScreen state={state} dispatch={dispatch} onExitPrototype={exitPrototype} />}
        {state.phase === 'adult-event' && <AdultEventScreen state={state} dispatch={dispatch} />}
        {state.phase === 'adult-result' && <AdultResultScreen state={state} dispatch={dispatch} />}
        {state.phase === 'ending' && <EndingScreen state={state} onRestart={restart} />}
      </div>
      {showJournal && <Journal state={state} />}
      {guideOpen && <GameGuide onClose={closeGuide} />}
    </div>
  );
}
