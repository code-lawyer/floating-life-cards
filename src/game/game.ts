import { ADULT_EVENTS, CHAPTERS, GROWTH_EVENTS, WORLD_CLIMATES, makeOrigin, makeOriginCard, originOptions } from './content';
import { getIdentityCardBonus, identityMakesFirstRedrawFree } from './identities';
import { getPrototypeChapter, PROTOTYPE_CARDS, PROTOTYPE_DECK_IDS, PROTOTYPE_SEED } from './prototype';
import { shuffle, takeOne } from './rng';
import type {
  Approach,
  AdultEvent,
  AdultEventChoice,
  Chapter,
  CombatPreview,
  Ending,
  EncounterState,
  GameAction,
  GameState,
  GrowthEvent,
  Intent,
  LifeCard,
  Resources,
  StartingIdentityId,
} from './types';

const MAX_RESOURCE = 9;
const HAND_SIZE = 4;

export function createGame(seed = Date.now() >>> 0): GameState {
  return {
    version: 4,
    mode: 'story',
    seed,
    rng: seed || 0x6d2b79f5,
    phase: 'title',
    origin: null,
    age: 4,
    resources: { heart: 7, money: 5, bonds: 5, pressure: 1 },
    traits: { insight: 0, nerve: 0, empathy: 0 },
    startingIdentity: null,
    cards: [],
    selectedDeck: [],
    growthResult: null,
    encounter: null,
    chapterResults: [],
    adultSchedule: [],
    adultEventsResolved: [],
    activeAdultEventId: null,
    adultEventResult: null,
    marks: [],
    cardExperience: {},
    upgradedCards: [],
    journal: [],
    ending: null,
  };
}

export function getGrowthEvent(state: GameState): GrowthEvent | null {
  return GROWTH_EVENTS.find((event) => event.age === state.age) ?? null;
}

function getChapterAt(state: GameState, chapterIndex: number): Chapter | null {
  if (state.mode === 'prototype') {
    return state.startingIdentity ? getPrototypeChapter(state.startingIdentity) : null;
  }
  return CHAPTERS[chapterIndex] ?? null;
}

export function getChapter(state: GameState): Chapter | null {
  return state.encounter ? getChapterAt(state, state.encounter.chapterIndex) : null;
}

export function getAdultEvent(state: GameState): AdultEvent | null {
  return state.activeAdultEventId ? ADULT_EVENTS.find((event) => event.id === state.activeAdultEventId) ?? null : null;
}

export function canChooseAdultChoice(state: GameState, choice: AdultEventChoice): boolean {
  if (state.phase !== 'adult-event') return false;
  if (!choice.requirement) return true;
  return state.resources[choice.requirement.resource] >= choice.requirement.min;
}

export function getWorldPower(state: GameState): number | null {
  if (!state.encounter) return null;
  const rule = getChapter(state)?.rule;
  const rulePower = rule?.effect.kind === 'escalating-world'
    ? Math.max(0, state.encounter.round - 1) * rule.effect.amount
    : 0;
  return Math.max(1, state.encounter.currentIntent.power + (state.encounter.climate.worldPower ?? 0)
    + rulePower + markAmount(state, 'world') + (state.resources.money <= 1 ? 1 : 0));
}

export function canBeginAdventure(state: GameState): boolean {
  return state.phase === 'deck' && state.selectedDeck.length === 8;
}

export function approachRelation(card: Approach, intent: Approach): 'advantage' | 'disadvantage' | 'even' {
  if (card === intent) return 'even';
  const beats: Record<Approach, Approach> = { 洞察: '共情', 共情: '行动', 行动: '洞察' };
  return beats[card] === intent ? 'advantage' : 'disadvantage';
}

function clamp(value: number): number {
  return Math.max(0, Math.min(MAX_RESOURCE, value));
}

function changeResource(resources: Resources, key: keyof Resources, amount: number): Resources {
  return { ...resources, [key]: clamp(resources[key] + amount) };
}

function applyCost(resources: Resources, resource: keyof Resources, amount: number): Resources {
  const delta = resource === 'pressure' ? amount : -amount;
  return changeResource(resources, resource, delta);
}

function rollOrigin(state: GameState): GameState {
  const options = originOptions();
  let rng = state.rng;
  let place: string;
  let household: string;
  let texture: string;
  let keepsake: string;
  [place, rng] = takeOne(options.places, rng);
  [household, rng] = takeOne(options.households, rng);
  [texture, rng] = takeOne(options.textures, rng);
  [keepsake, rng] = takeOne(options.keepsakes, rng);
  const serial = `FL-${String(state.seed % 10000).padStart(4, '0')}-${String((rng >>> 8) % 1000).padStart(3, '0')}`;
  return { ...state, rng, origin: makeOrigin(serial, place, household, texture, keepsake), phase: 'origin' };
}

function autoSelect(cards: LifeCard[]): string[] {
  const picked: LifeCard[] = [];
  const approaches: Approach[] = ['洞察', '行动', '共情'];
  for (const approach of approaches) {
    picked.push(
      ...cards
        .filter((card) => card.approach === approach)
        .sort((a, b) => b.power + b.guard - (a.power + a.guard))
        .slice(0, 2),
    );
  }
  const remaining = cards
    .filter((card) => !picked.some((item) => item.id === card.id))
    .sort((a, b) => b.power + b.guard - (a.power + a.guard));
  return [...picked, ...remaining].slice(0, 8).map((card) => card.id);
}

function refillHand(encounter: EncounterState, target: number, rng: number): [EncounterState, number] {
  let drawPile = [...encounter.drawPile];
  let memoryPile = [...encounter.memoryPile];
  const hand = [...encounter.hand];
  let next = rng;
  while (hand.length < target) {
    if (drawPile.length === 0) {
      if (memoryPile.length === 0) break;
      [drawPile, next] = shuffle(memoryPile, next);
      memoryPile = [];
    }
    const drawn = drawPile.shift();
    if (drawn) hand.push(drawn);
  }
  return [{ ...encounter, drawPile, memoryPile, hand }, next];
}

function startEncounter(state: GameState, chapterIndex: number): GameState {
  const chapter = getChapterAt(state, chapterIndex);
  if (!chapter) return state;
  let drawPile: string[];
  let rng: number;
  [drawPile, rng] = shuffle(state.selectedDeck, state.rng);
  let climate: (typeof WORLD_CLIMATES)[number];
  [climate, rng] = takeOne(WORLD_CLIMATES, rng);
  let encounter: EncounterState = {
    chapterIndex,
    round: 1,
    progress: 0,
    drawPile,
    hand: [],
    memoryPile: [],
    currentIntent: chapter.intents[0]!,
    climate,
    records: [],
    redrawUsed: false,
    warmthUsed: false,
    warmthCardId: null,
    approachHistory: [],
    resolved: false,
    won: false,
  };
  [encounter, rng] = refillHand(encounter, HAND_SIZE, rng);
  return {
    ...state,
    rng,
    phase: 'encounter',
    encounter,
    journal: [
      ...state.journal,
      { stamp: `${chapter.year} 岁`, title: chapter.title, body: chapter.premise, tone: 'plain' },
    ],
  };
}

function startPrototype(identityId: StartingIdentityId): GameState {
  const prototype = createGame(PROTOTYPE_SEED);
  return startEncounter({
    ...prototype,
    mode: 'prototype',
    resources: { heart: 8, money: 5, bonds: 5, pressure: 2 },
    traits: { insight: 4, nerve: 4, empathy: 4 },
    startingIdentity: identityId,
    cards: PROTOTYPE_CARDS,
    selectedDeck: PROTOTYPE_DECK_IDS,
    journal: [{ stamp: '24 岁 · 原型', title: '合同上没有写的事', body: '跳过童年流程，使用固定记忆与身份进入同一场制作验证。', tone: 'plain' }],
  }, 0);
}

function buildAdultSchedule(state: GameState): [GameState['adultSchedule'], number] {
  const schedule: GameState['adultSchedule'] = [];
  let rng = state.rng;
  for (let afterChapter = 0; afterChapter < CHAPTERS.length; afterChapter += 1) {
    const pool = ADULT_EVENTS.filter((event) => event.afterChapter === afterChapter);
    let shuffled: AdultEvent[];
    [shuffled, rng] = shuffle(pool, rng);
    schedule.push(
      ...shuffled.slice(0, 2).map((event) => ({ eventId: event.id, afterChapter, age: event.age })),
    );
  }
  return [schedule.sort((a, b) => a.afterChapter - b.afterChapter || a.age - b.age), rng];
}

function markAmount(state: GameState, kind: GameState['marks'][number]['effect']['kind'], approach?: Approach): number {
  return state.marks
    .filter((mark) => mark.effect.kind === kind && (!mark.effect.approach || mark.effect.approach === approach))
    .reduce((sum, mark) => sum + mark.effect.amount, 0);
}

function advanceAdultJourney(state: GameState): GameState {
  if (!state.encounter) return state;
  if (state.resources.heart <= 0) {
    const ending = endingFor(state);
    return { ...state, phase: 'ending', activeAdultEventId: null, ending };
  }
  const afterChapter = state.encounter.chapterIndex;
  const nextEvent = state.adultSchedule.find(
    (slot) => slot.afterChapter === afterChapter && !state.adultEventsResolved.includes(slot.eventId),
  );
  if (nextEvent) {
    return { ...state, phase: 'adult-event', activeAdultEventId: nextEvent.eventId, adultEventResult: null };
  }
  const nextChapter = afterChapter + 1;
  if (nextChapter >= CHAPTERS.length) {
    const ending = endingFor(state);
    return { ...state, phase: 'ending', activeAdultEventId: null, ending };
  }
  const recovery = Math.max(0, 2 + markAmount(state, 'recovery'));
  const recovered = changeResource(changeResource(state.resources, 'heart', recovery), 'pressure', -1);
  return startEncounter({ ...state, resources: recovered, activeAdultEventId: null }, nextChapter);
}

function traitBonus(state: GameState, approach: Approach): number {
  const value = approach === '洞察' ? state.traits.insight : approach === '行动' ? state.traits.nerve : state.traits.empathy;
  return Math.floor(value / 3);
}

export function getRedrawPressureCost(state: GameState): number {
  if (identityMakesFirstRedrawFree(state.startingIdentity)) return 0;
  return Math.max(0, 1 + markAmount(state, 'redraw'));
}

export function previewCardPlay(state: GameState, card: LifeCard): CombatPreview | null {
  if (!state.encounter) return null;
  const relation = approachRelation(card.approach, state.encounter.currentIntent.approach);
  const relationBonus = relation === 'advantage' ? 2 : relation === 'disadvantage' ? -1 : 0;
  const echoBonus = card.effect.kind === 'echo' && state.encounter.records.at(-1)?.outcome === 'loss' ? 2 : 0;
  const steadyBonus = card.effect.kind === 'steady' && state.resources.pressure >= 4 ? 2 : 0;
  const climateBonus = state.encounter.climate.approachBoost === card.approach ? 1 : 0;
  const lifeMarkBonus = markAmount(state, 'approach', card.approach);
  const firstRoundBonus = state.encounter.round === 1 ? markAmount(state, 'first-round') : 0;
  const masteryBonus = state.upgradedCards.includes(card.id) ? 1 : 0;
  const identityBonus = getIdentityCardBonus(state.startingIdentity, card, state.encounter.round);
  const resourceBonus = (state.resources.money >= 7 && state.encounter.round === 1 ? 1 : 0)
    + (card.approach === '共情' ? (state.resources.bonds >= 7 ? 1 : state.resources.bonds <= 1 ? -1 : 0) : 0);
  const approachHistory = [...state.encounter.approachHistory, card.approach].slice(-3);
  const triad = approachHistory.length === 3 && new Set(approachHistory).size === 3;
  const practiced = state.encounter.approachHistory.at(-1) === card.approach;
  const comboBonus = triad ? 3 : practiced ? 1 : 0;
  const progressBonus = triad ? markAmount(state, 'combo') : 0;
  const comboText = triad
    ? `三式合流 · 牌力 +3，压力 −1${progressBonus > 0 ? `，额外推进 +${progressBonus}` : ''}`
    : practiced ? '惯用手 · 牌力 +1' : undefined;
  const growthBonus = traitBonus(state, card.approach);
  const modifiers = [
    { label: '卡牌基础', value: card.power },
    { label: relation === 'advantage' ? '克制' : relation === 'disadvantage' ? '受制' : '同型', value: relationBonus },
    { label: `${card.approach}成长`, value: growthBonus },
    { label: '卡牌效果', value: echoBonus + steadyBonus },
    { label: '时代气候', value: climateBonus },
    { label: '人生状态', value: lifeMarkBonus + firstRoundBonus },
    { label: '起手身份', value: identityBonus },
    { label: '淬炼', value: masteryBonus },
    { label: '资源余量', value: resourceBonus },
    { label: triad ? '三式合流' : practiced ? '惯用手' : '组合', value: comboBonus },
  ].filter((item, index) => index === 0 || item.value !== 0);
  return {
    playerScore: Math.max(0, modifiers.reduce((sum, item) => sum + item.value, 0)),
    worldScore: getWorldPower(state) ?? state.encounter.currentIntent.power,
    progressBonus,
    relation,
    comboText,
    triad,
    approachHistory,
    modifiers,
  };
}

function resolveText(card: LifeCard, intent: Intent, score: number, world: number, custom?: string): string {
  if (custom?.trim()) return custom.trim();
  if (score > world) return `你用「${card.title}」接住了${intent.title}。旧记忆没有替你回答，却让你知道下一句从哪里开始。`;
  if (score === world) return `「${card.title}」与${intent.title}僵持不下。世界没有让路，你也没有后退。`;
  return `「${card.title}」没能完全挡住${intent.title}。这张牌不是答案，但它替你保住了继续出牌的位置。`;
}

function endingFor(state: GameState): Ending {
  const wins = state.chapterResults.filter(Boolean).length;
  const dominant = Object.entries(state.traits).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (wins === CHAPTERS.length) {
    return {
      title: '仍在牌桌上的人', kicker: '不是天选，只是没有把手里的普通牌看轻。',
      text: '你没有赢过世界。你只是一次次识别它、回应它，也允许自己在必要时改变打法。那些四岁起攒下的小事，终于组成了一种旁人拿不走的能力。',
      postscript: '后来有人问你成功靠什么。你想起一支蓝蜡笔、一张六十八分的试卷，以及很多没有被写进简历的下午。',
    };
  }
  if (wins >= 3) {
    const titles = { insight: '看见暗线的人', nerve: '先迈一步的人', empathy: '给别人留座的人' } as const;
    return {
      title: titles[dominant as keyof typeof titles] ?? '把日子接住的人', kicker: `${wins} 次越过局面，${CHAPTERS.length - wins} 次带着代价继续。`,
      text: '你的人生没有形成一条漂亮的上升曲线。它更像反复修改的手稿：有删节，有污点，也有几句只有经历过的人才写得出来的话。',
      postscript: '你终于不再问哪张牌最强，而是知道何时该把哪段自己放到桌上。',
    };
  }
  if (state.resources.heart <= 1) {
    return {
      title: '暂时离席的人', kicker: '休息不是一张废牌。',
      text: '你曾把坚持误解成永远不能停下。最后，身体替你作出了决定。牌局暂时远去，生活缩小到睡好一觉、回一条消息、重新吃下一顿热饭。',
      postscript: '几个月后，你翻出那只旧物。你没有马上回到牌桌，但第一次不再为此感到羞愧。',
    };
  }
  return {
    title: '改写规则的人', kicker: '有些局面不值得赢，离开也会留下路。',
    text: '按世界给出的计分法，你输得不少。可你开始辨认：哪些门槛必须跨，哪些掌声可以不要，哪些关系即使昂贵也值得保留。',
    postscript: '你的档案没有盖上“成功”或“失败”的章。最后一页只有一行手写字：下次，由我来定题。',
  };
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'BEGIN':
      return rollOrigin(createGame(state.seed));
    case 'REROLL_ORIGIN':
      return state.phase === 'origin' ? rollOrigin(state) : state;
    case 'ACCEPT_ORIGIN': {
      if (state.phase !== 'origin' || !state.origin) return state;
      const card = makeOriginCard(state.origin);
      return {
        ...state, phase: 'growth', cards: [card],
        journal: [{ stamp: '出身', title: '普通人的起点', body: state.origin.sentence, tone: 'plain' }],
      };
    }
    case 'CHOOSE_GROWTH': {
      if (state.phase !== 'growth') return state;
      const event = getGrowthEvent(state);
      const selected = event?.choices.find((item) => item.id === action.choiceId);
      if (!event || !selected) return state;
      let rng = state.rng;
      let template: Omit<LifeCard, 'id' | 'originAge'>;
      let cost: (typeof selected.costs)[number];
      [template, rng] = takeOne(selected.cards, rng);
      [cost, rng] = takeOne(selected.costs, rng);
      const card: LifeCard = { ...template, id: `${event.age}-${selected.id}-${rng.toString(16)}`, originAge: event.age };
      const resources = applyCost(state.resources, cost.resource, cost.amount);
      const traits = { ...state.traits, [selected.trait]: state.traits[selected.trait] + 1 };
      const resultText = `${selected.detail}${cost.text}`;
      return {
        ...state, rng, resources, traits, cards: [...state.cards, card], phase: 'growth-result',
        growthResult: { age: event.age, choice: selected.verb, card, cost, text: resultText },
        journal: [...state.journal, { stamp: `${event.age} 岁`, title: event.title, body: `${selected.verb}。你得到「${card.title}」。${cost.text}`, tone: cost.amount > 0 ? 'bad' : 'good' }],
      };
    }
    case 'CONTINUE_GROWTH': {
      if (state.phase !== 'growth-result') return state;
      if (state.age >= 17) return { ...state, phase: 'deck', growthResult: null, selectedDeck: autoSelect(state.cards) };
      return { ...state, age: state.age + 1, phase: 'growth', growthResult: null };
    }
    case 'TOGGLE_DECK': {
      if (state.phase !== 'deck' || !state.cards.some((card) => card.id === action.cardId)) return state;
      const exists = state.selectedDeck.includes(action.cardId);
      if (!exists && state.selectedDeck.length >= 8) return state;
      return { ...state, selectedDeck: exists ? state.selectedDeck.filter((id) => id !== action.cardId) : [...state.selectedDeck, action.cardId] };
    }
    case 'AUTO_DECK':
      return state.phase === 'deck' ? { ...state, selectedDeck: autoSelect(state.cards) } : state;
    case 'START_PROTOTYPE': {
      if (state.phase !== 'title') return state;
      return startPrototype(action.identityId);
    }
    case 'RESTART_PROTOTYPE':
      return state.mode === 'prototype' && state.phase === 'encounter-result' && state.startingIdentity
        ? startPrototype(state.startingIdentity)
        : state;
    case 'BEGIN_ADVENTURE': {
      if (!canBeginAdventure(state)) return state;
      let adultSchedule: GameState['adultSchedule'];
      let rng: number;
      [adultSchedule, rng] = buildAdultSchedule(state);
      return startEncounter({ ...state, rng, adultSchedule }, 0);
    }
    case 'PLAY_CARD': {
      if (state.phase !== 'encounter' || !state.encounter || state.encounter.resolved) return state;
      const card = state.cards.find((item) => item.id === action.cardId);
      if (!card || !state.encounter.hand.includes(card.id)) return state;
      const chapter = getChapter(state);
      if (!chapter) return state;
      const intent = state.encounter.currentIntent;
      const preview = previewCardPlay(state, card)!;
      const { playerScore, worldScore, progressBonus, triad, approachHistory, comboText } = preview;
      const outcome = playerScore > worldScore ? 'win' : playerScore === worldScore ? 'draw' : 'loss';
      const progressGain = (outcome === 'win' ? 2 + Math.min(3, playerScore - worldScore) : outcome === 'draw' ? 1 : 0)
        + progressBonus;
      let resources = state.resources;
      if (outcome === 'loss') {
        resources = changeResource(resources, 'heart', -Math.max(1, worldScore - playerScore - card.guard));
        resources = changeResource(resources, 'pressure', 1);
      } else if (outcome === 'draw') {
        resources = changeResource(resources, 'pressure', 1);
      }
      if (triad) resources = changeResource(resources, 'pressure', -1);
      if (card.effect.kind === 'resource' && card.effect.resource && card.effect.amount && (outcome === 'win' || card.effect.resource === 'pressure')) {
        resources = changeResource(resources, card.effect.resource, card.effect.amount);
      }
      const nextExperience = (state.cardExperience[card.id] ?? 0) + 1;
      const masteredNow = nextExperience >= 2 && !state.upgradedCards.includes(card.id);
      const cardExperience = { ...state.cardExperience, [card.id]: nextExperience };
      const upgradedCards = masteredNow ? [...state.upgradedCards, card.id] : state.upgradedCards;
      let encounter: EncounterState = {
        ...state.encounter,
        progress: state.encounter.progress + progressGain,
        hand: state.encounter.hand.filter((id) => id !== card.id),
        memoryPile: [...state.encounter.memoryPile, card.id],
        approachHistory,
        records: [...state.encounter.records, {
          cardTitle: card.title, intentTitle: intent.title, playerScore, worldScore, outcome,
          text: resolveText(card, intent, playerScore, worldScore, action.judgeText),
          comboText,
          masteredCard: masteredNow ? card.title : undefined,
        }],
      };
      const hitTarget = encounter.progress >= chapter.target;
      const outOfRounds = encounter.round >= chapter.rounds;
      const exhausted = resources.heart <= 0;
      if (hitTarget || outOfRounds || exhausted) {
        const won = hitTarget && !exhausted;
        encounter = { ...encounter, resolved: true, won };
        return {
          ...state, resources, encounter, cardExperience, upgradedCards, phase: 'encounter-result',
          chapterResults: [...state.chapterResults, won],
          journal: [...state.journal, {
            stamp: `${chapter.year} 岁 · 结案`, title: won ? '越过局面' : '带伤离开',
            body: won ? chapter.victory : chapter.setback, tone: won ? 'good' : 'bad',
          }],
        };
      }
      encounter = { ...encounter, round: encounter.round + 1, currentIntent: chapter.intents[encounter.round]! };
      const targetHand = card.effect.kind === 'draw' && outcome === 'win' ? HAND_SIZE + 1 : HAND_SIZE;
      let rng: number;
      [encounter, rng] = refillHand(encounter, targetHand, state.rng);
      return { ...state, rng, resources, encounter, cardExperience, upgradedCards };
    }
    case 'REDRAW_HAND': {
      if (state.phase !== 'encounter' || !state.encounter || state.encounter.redrawUsed) return state;
      const pressureCost = getRedrawPressureCost(state);
      const previousHand = state.encounter.hand;
      let encounter: EncounterState = {
        ...state.encounter,
        hand: [],
        redrawUsed: true,
      };
      let rng: number;
      [encounter, rng] = refillHand(encounter, HAND_SIZE, state.rng);
      let drawPile: string[];
      [drawPile, rng] = shuffle([...encounter.drawPile, ...previousHand], rng);
      encounter = { ...encounter, drawPile };
      return { ...state, rng, encounter, resources: changeResource(state.resources, 'pressure', pressureCost) };
    }
    case 'RECALL_MEMORY': {
      if (state.phase !== 'encounter' || !state.encounter || state.encounter.resolved || state.encounter.warmthUsed) return state;
      if (!state.encounter.memoryPile.includes(action.cardId)) return state;
      return {
        ...state,
        resources: changeResource(state.resources, 'pressure', -1),
        encounter: {
          ...state.encounter,
          memoryPile: state.encounter.memoryPile.filter((id) => id !== action.cardId),
          hand: [...state.encounter.hand, action.cardId],
          warmthUsed: true,
          warmthCardId: action.cardId,
        },
      };
    }
    case 'CONTINUE_ADVENTURE': {
      if (state.mode !== 'story' || state.phase !== 'encounter-result' || !state.encounter) return state;
      return advanceAdultJourney(state);
    }
    case 'CHOOSE_ADULT_EVENT': {
      const event = getAdultEvent(state);
      const choice = event?.choices.find((item) => item.id === action.choiceId);
      if (!event || !choice || !canChooseAdultChoice(state, choice)) return state;
      let resources = state.resources;
      for (const [key, amount] of Object.entries(choice.changes) as Array<[keyof Resources, number]>) {
        resources = changeResource(resources, key, amount);
      }
      const traits = choice.trait ? { ...state.traits, [choice.trait]: state.traits[choice.trait] + 1 } : state.traits;
      let marks = choice.removeMark ? state.marks.filter((mark) => mark.id !== choice.removeMark) : state.marks;
      const gainedMark = choice.mark && !marks.some((mark) => mark.id === choice.mark!.id) ? choice.mark : null;
      if (gainedMark) marks = [...marks, gainedMark];
      let rng = state.rng;
      let outcome: string;
      [outcome, rng] = takeOne(choice.outcomes, rng);
      let upgradedCardId: string | null = null;
      let upgradedCards = state.upgradedCards;
      if (choice.upgradeCard) {
        const candidates = state.selectedDeck.filter((id) => !state.upgradedCards.includes(id));
        if (candidates.length > 0) {
          [upgradedCardId, rng] = takeOne(candidates, rng);
          upgradedCards = [...state.upgradedCards, upgradedCardId];
        }
      }
      const upgradedCard = upgradedCardId ? state.cards.find((card) => card.id === upgradedCardId) : null;
      const adultEventResult = {
        eventId: event.id,
        choice: choice.verb,
        outcome,
        changes: choice.changes,
        mark: gainedMark,
        upgradedCardId,
      };
      return {
        ...state, rng, resources, traits, marks, upgradedCards, adultEventResult, phase: 'adult-result',
        journal: [...state.journal, {
          stamp: `${event.age} 岁`, title: event.title,
          body: `${choice.verb}。${outcome}${upgradedCard ? `「${upgradedCard.title}」因此被重新理解。` : ''}`,
          tone: choice.mark?.tone === 'bad' ? 'bad' : choice.mark?.tone === 'good' ? 'good' : 'plain',
        }],
      };
    }
    case 'CONTINUE_ADULT_EVENT': {
      if (state.phase !== 'adult-result' || !state.activeAdultEventId) return state;
      const adultEventsResolved = state.adultEventsResolved.includes(state.activeAdultEventId)
        ? state.adultEventsResolved
        : [...state.adultEventsResolved, state.activeAdultEventId];
      return advanceAdultJourney({ ...state, adultEventsResolved, activeAdultEventId: null, adultEventResult: null });
    }
    case 'RESTART':
      return createGame(action.seed ?? ((Date.now() ^ state.rng) >>> 0));
    default:
      return state;
  }
}
