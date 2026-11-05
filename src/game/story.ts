import { ADULT_EVENTS, GROWTH_EVENTS, makeGrowthChoice } from './content';
import { CONSTRAINT_FALLBACK } from './constants';
import type { AdultEvent, GameState, GrowthEvent, LifeCard, MemoryEcho, MemoryRequirement } from './types';

type StoryContext = Pick<GameState, 'storyEdition' | 'storyChoices' | 'cards'>;

/** These are authored continuations, selected by decisions already made. No extra RNG is consumed. */
export const GROWTH_CONTINUATIONS: Array<{ requirement: MemoryRequirement; event: GrowthEvent }> = [
  {
    requirement: { age: 9, choiceIds: ['9a'], text: '九岁时拆开过收音机的后盖' },
    event: {
      age: 10, stage: '小学', title: '杂音里的第二个下午', artAge: 9,
      text: '那台旧收音机终于响了，却每隔一会儿就断掉。修理铺的师傅给你留了张废纸：“这回别急着碰线，先记下它什么时候不响。”窗外，朋友正在喊你去玩。',
      question: '已经有了一点进展，还要把多少时间留在这里？',
      echo: { sourceAge: 9, text: '去年打开的后盖，今年仍没有合上。有些选择会多留你一个下午。' },
      choices: [
        makeGrowthChoice('10r-a', '把每次断音记下来', '慢一点，找出重复发生的条件。', '洞察', ['断音记录', '那张歪歪扭扭的记录表，比碰运气更接近答案。'], ['排查顺序', '你学会一次只改变一个条件。'], ['手艺', '学习']),
        makeGrowthChoice('10r-b', '自己重新接好松线', '手上有把握的部分，先试着完成。', '行动', ['接回去的声音', '指尖沾着灰，喇叭里重新有了人声。'], ['手上的把握', '动手没有替代思考，却让猜测有了结果。'], ['手艺', '担当']),
        makeGrowthChoice('10r-c', '请师傅一起听一会儿', '承认自己还没找到，也不把问题全交出去。', '共情', ['一起听杂音', '求助不是交出后盖，而是请另一个人靠近。'], ['留下的工位', '师傅给你挪了半张凳子，没有替你做完。'], ['手艺', '关系']),
      ],
    },
  },
  {
    requirement: { age: 8, choiceIds: ['8c'], text: '八岁时替同桌挡住过追问' },
    event: {
      age: 12, stage: '小学', title: '寄到旧座位的信', artAge: 12,
      text: '转学四年的同桌阿禾寄来一封信。他说新学校还好，又在最后划掉了这句话。信封里夹着半张合照，背面仍记着你当年说的：“给他一点时间。”',
      question: '你可以陪他，但不必替他决定要说多少。',
      echo: { sourceAge: 8, text: '你守住的那半句话，被另一个人带去了很远的地方。' },
      choices: [
        makeGrowthChoice('12f-a', '先问他想要哪种帮助', '是想听办法，还是只想有人读完这封信。', '洞察', ['先问再帮', '你把“我觉得你需要”改成了一个问题。'], ['信里的留白', '没有写下来的部分，也值得被尊重。'], ['学习', '关系']),
        makeGrowthChoice('12f-b', '约一个能见面的周末', '先确认车次与家人的安排，再把日期写回去。', '行动', ['写进日历的见面', '一句“以后”终于有了具体的一天。'], ['两站公交', '距离变成了一条可以亲自走的路。'], ['探索', '担当']),
        makeGrowthChoice('12f-c', '回一封自己的近况', '说说你也没处理好的事，留他慢慢回答。', '共情', ['不用马上回信', '你没有把关心变成下一道必须完成的题。'], ['各自的一半', '两个人都不必只做那个被照顾的人。'], ['关系', '担当']),
      ],
    },
  },
];

export const ECHO_ADULT_EVENTS: AdultEvent[] = [
  {
    id: 'repair-call', afterChapter: 1, age: 23, category: '旧事回响', title: '又一次响起的杂音',
    text: '周末，旧修理铺的师傅请你帮忙看一台反复断音的设备。客户急着开门，催他直接换掉整块零件。桌上的废纸，和你十岁时用过的一样薄。',
    question: '这次有人在等结果，时间也开始有了价格。',
    echo: { sourceAge: 10, text: '童年没有替你准备标准答案，只留下一种面对故障的办法。' },
    choices: [
      { id: 'replace', verb: '按时换件，先恢复使用', detail: '承担材料差价，换一个确定的交付时间。', changes: { money: -2, heart: 1, pressure: -1 }, outcomes: ['店按时开了门。旧零件被收进纸盒，没弄清的原因仍留在那里；今天的确定也确实有用。'] },
      { id: 'share', verb: '请师傅分担一半排查', detail: '少拿一点报酬，给经验和协作都留位置。', changes: { money: 1, bonds: 1, pressure: 1 }, outcomes: ['你们把检查分成两段。挣得不多，却找到了以后还能一起接活的节奏。'], trait: 'empathy' },
      { id: 'decline', verb: '说明自己这周没有余力', detail: '替师傅联系别的维修人，把这个周末还给自己。', changes: { heart: 2, bonds: -1 }, outcomes: ['电话那头沉默了一会儿，随后说了声好。你没有接下每一件能做的事，也没有因此忘掉手艺。'] },
      { id: 'trace', verb: '拿出当年的排查顺序', detail: '亲自花时间验证原因，约定查不出也如实说明。', changes: { heart: -1, money: 2, pressure: -1 }, memoryRequirement: { age: 10, choiceIds: ['10r-a'], text: '需要十岁时选择“把每次断音记下来”' }, upgradeMemoryAge: 10,
        outcomes: ['故障只在发热后出现。你照着熟悉的顺序缩小范围，找到了接触不良的地方。客户付了排查费，你也错过了整个下午。那张旧记录表，终于接住了一件成年人的事。'] },
    ],
  },
  {
    id: 'old-classmate', afterChapter: 2, age: 27, category: '旧事回响', title: '这一次，他把话说完了',
    text: '阿禾发来很长的语音。他失去了工作，想借一笔钱撑过转行的几个月。你听见熟悉的停顿，随后是：“你不方便也可以说，我这次会把话讲完。”',
    question: '当年的陪伴到了今天，还能保留怎样的边界？',
    echo: { sourceAge: 12, text: '那封寄到旧座位的信，后来变成了这次敢开口的关系。' },
    choices: [
      { id: 'lend', verb: '借钱，也说清还款安排', detail: '承认这笔钱可能晚些回来，把自己的余量算进去。', changes: { money: -3, bonds: 3, pressure: 1 }, outcomes: ['你们把金额和日期写在同一条消息里。约定没有让友情变薄，只是让双方都知道这份信任有多重。'] },
      { id: 'listen', verb: '陪他走一段求职的路', detail: '拿出时间一起看机会，不承诺自己拿不出的现金。', changes: { heart: -1, bonds: 2 }, outcomes: ['你们改完简历时，街上的灯已经亮了。工作没有立刻找到，但他终于能说出自己最害怕的是什么。'], trait: 'empathy' },
      { id: 'limit', verb: '坦白自己也在勉强支撑', detail: '拒绝借款，留下以后还能联系的门。', changes: { heart: 1, bonds: -1, pressure: -1 }, outcomes: ['你把自己的账也说了出来。他有些失望，却没有把那封旧信收回。关系里第一次容得下一个清楚的“不”。'] },
      { id: 'ask', verb: '先问他最需要哪一种帮助', detail: '沿用信里的约定，一起列清眼前最急的一件事。', changes: { money: -1, heart: -1, bonds: 2, pressure: -1 }, memoryRequirement: { age: 12, choiceIds: ['12f-a', '12f-c'], text: '需要十二岁时给对方留下回答的空间' }, upgradeMemoryAge: 12,
        outcomes: ['他需要的其实是面试那天有人代班。你们找到一位愿意互换时间的朋友。你出了一点路费和一个晚上，没有许下无法兑现的“都交给我”。'] },
    ],
  },
];

export const ALL_ADULT_EVENTS = [...ADULT_EVENTS, ...ECHO_ADULT_EVENTS];
export const ALL_GROWTH_EVENTS = [...GROWTH_EVENTS, ...GROWTH_CONTINUATIONS.map((item) => item.event)];

export function remembersChoice(state: Pick<GameState, 'storyChoices'>, requirement: MemoryRequirement): boolean {
  return requirement.choiceIds.includes(state.storyChoices[`growth:${requirement.age}`] ?? '');
}

export function resolveGrowthEvent(state: Pick<GameState, 'storyEdition' | 'storyChoices' | 'age'>): GrowthEvent | null {
  const continuation = state.storyEdition === 'echoes'
    ? GROWTH_CONTINUATIONS.find(({ event, requirement }) => event.age === state.age && remembersChoice(state, requirement))
    : undefined;
  return continuation?.event ?? GROWTH_EVENTS.find((event) => event.age === state.age) ?? null;
}

export function getScheduledEcho(state: StoryContext, afterChapter: number): AdultEvent | undefined {
  if (state.storyEdition !== 'echoes') return undefined;
  if (afterChapter === 1 && state.storyChoices['growth:10']?.startsWith('10r-')) return ECHO_ADULT_EVENTS[0];
  if (afterChapter === 2 && state.storyChoices['growth:12']?.startsWith('12f-')) return ECHO_ADULT_EVENTS[1];
  return undefined;
}

export function memoryForEcho(state: Pick<GameState, 'cards'>, echo: MemoryEcho): LifeCard | null {
  return state.cards.find((card) => card.originAge === echo.sourceAge) ?? null;
}

export interface LifeThread {
  id: string;
  title: string;
  origin: LifeCard;
  continuation: LifeCard;
  adultEvent: AdultEvent;
  choice: string | null;
  outcome: string | null;
}

/** Derived from facts already saved; never turn a future event into a claimed memory. */
export function getLifeThreads(state: StoryContext): LifeThread[] {
  if (state.storyEdition !== 'echoes') return [];
  return GROWTH_CONTINUATIONS.flatMap(({ requirement, event }, index) => {
    if (!remembersChoice(state, requirement)) return [];
    const origin = state.cards.find((card) => card.originAge === requirement.age);
    const continuation = state.cards.find((card) => card.originAge === event.age);
    if (!origin || !continuation || !state.storyChoices[`growth:${event.age}`]?.includes(index === 0 ? '10r-' : '12f-')) return [];
    const adultEvent = ECHO_ADULT_EVENTS[index]!;
    const chosenId = state.storyChoices[`adult:${adultEvent.id}`];
    const chosen = adultEvent.choices.find((item) => item.id === chosenId);
    return [{
      id: adultEvent.id,
      title: index === 0 ? '从杂音里找回声音' : '给另一个人留下回答的空间',
      origin, continuation, adultEvent,
      choice: chosen?.verb ?? (chosenId === CONSTRAINT_FALLBACK.id ? CONSTRAINT_FALLBACK.verb : null),
      outcome: chosen?.outcomes[0] ?? (chosenId === CONSTRAINT_FALLBACK.id ? '当时的余量不够，旧经历也没能替你承担所有代价。但它仍然属于你。' : null),
    }];
  });
}

export function getDepartureRecovery(state: Pick<GameState, 'mode' | 'storyEdition' | 'resources'>): number {
  return state.mode === 'story' && state.storyEdition === 'echoes' ? Math.max(0, 3 - state.resources.heart) : 0;
}

export function personalPostscript(state: GameState): string | null {
  if (state.mode !== 'story' || state.storyEdition !== 'echoes') return null;
  const mostUsed = state.cards.filter((card) => (state.cardExperience[card.id] ?? 0) > 0)
    .sort((a, b) => (state.cardExperience[b.id] ?? 0) - (state.cardExperience[a.id] ?? 0))[0];
  const decision = getLifeThreads(state).find((item) => item.choice)
    ?? [...state.adultEventsResolved].reverse().map((id) => {
      const adultEvent = ALL_ADULT_EVENTS.find((event) => event.id === id);
      const chosenId = state.storyChoices[`adult:${id}`];
      const choice = adultEvent?.choices.find((item) => item.id === chosenId)?.verb
        ?? (chosenId === CONSTRAINT_FALLBACK.id ? CONSTRAINT_FALLBACK.verb : null);
      return adultEvent && choice ? { adultEvent, choice } : null;
    }).find((item) => item !== null);
  const sentence = mostUsed
    ? `后来整理旧物时，你又想起「${mostUsed.title}」。这段${typeof mostUsed.originAge === 'number' ? `${mostUsed.originAge}岁留下的` : '最早的'}记忆，曾在成年牌桌上被你唤起${state.cardExperience[mostUsed.id]}次。`
    : `你把${state.cards.length}段记忆收进档案。还没来得及使用的经历，也没有失去属于你的那一页。`;
  return decision ? `${sentence}至于「${decision.adultEvent.title}」，你记得自己最终选择了：${decision.choice}。` : sentence;
}

/** v4/v5 cards encode their origin choice. Older adult choices cannot be reliably reconstructed. */
export function inferLegacyChoices(cards: LifeCard[]): Record<string, string> {
  const choices: Record<string, string> = {};
  for (const card of cards) {
    const event = GROWTH_EVENTS.find((item) => item.age === card.originAge);
    const choice = event?.choices.find((item) => card.id.startsWith(`${event.age}-${item.id}-`));
    if (event && choice) choices[`growth:${event.age}`] = choice.id;
  }
  return choices;
}

export function isKnownStoryChoice(key: string, value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (key.startsWith('growth:')) {
    const age = Number(key.slice(7));
    return key === `growth:${age}` && ALL_GROWTH_EVENTS.some((event) => event.age === age && event.choices.some((choice) => choice.id === value));
  }
  const event = ALL_ADULT_EVENTS.find((item) => `adult:${item.id}` === key);
  return Boolean(event && (value === CONSTRAINT_FALLBACK.id || event.choices.some((choice) => choice.id === value)));
}
