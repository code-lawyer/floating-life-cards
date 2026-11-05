import { ADULT_EVENTS as BASE_ADULT_EVENTS, CHAPTERS, GROWTH_EVENTS, WORLD_CLIMATES, makeOrigin, makeOriginCard, originOptions } from './content';
import { ALL_ADULT_EVENTS as ADULT_EVENTS, ALL_GROWTH_EVENTS, GROWTH_CONTINUATIONS, isKnownStoryChoice } from './story';
import { ADULT_EVENTS_PER_CHAPTER, DECK_SIZE } from './constants';
import { STARTING_IDENTITIES, getMemoryTags, isRecognizedTagSignal } from './identities';
import { PROTOTYPE_CARDS, PROTOTYPE_DECK_IDS, getPrototypeChapter } from './prototype';
import type { AdultEvent, Chapter, LifeCard } from './types';

/** 卡牌数值与标签部分；童年奖励牌在成形前还没有 id 与 originAge。 */
type CardShape = Pick<LifeCard, 'title' | 'approach' | 'power' | 'guard' | 'effect' | 'tags'>;

export interface ContentValidationResult {
  /** 只在 errors 为空时为真；warnings 不阻塞。 */
  valid: boolean;
  /** 会导致崩溃、静默失效或引用悬空的问题。 */
  errors: string[];
  /** 不破坏运行，但会让内容悄悄失去表达力的漂移。 */
  warnings: string[];
}

interface Report {
  errors: string[];
  warnings: string[];
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  return [...duplicated];
}

function checkChapter(chapter: Chapter, label: string, report: Report): void {
  // reduceGame 每轮推进时直接取 intents[round]，缺一条意图就是运行时崩溃。
  if (chapter.rounds < 1) report.errors.push(`${label}：rounds 必须至少为 1，当前为 ${chapter.rounds}`);
  if (chapter.intents.length < chapter.rounds) {
    report.errors.push(`${label}：${chapter.rounds} 轮需要至少 ${chapter.rounds} 条世界意图，当前只有 ${chapter.intents.length} 条`);
  }
  if (chapter.target < 1) report.errors.push(`${label}：target 必须为正数，当前为 ${chapter.target}`);
  for (const duplicate of findDuplicates(chapter.intents.map((intent) => intent.id))) {
    report.errors.push(`${label}：世界意图 id 重复「${duplicate}」`);
  }
}

function checkCard(card: CardShape, label: string, report: Report): void {
  if (card.power < 0) report.errors.push(`${label}：power 不能为负，当前为 ${card.power}`);
  if (card.guard < 0) report.errors.push(`${label}：guard 不能为负，当前为 ${card.guard}`);
  // 编译期的判别联合之外，仍保留对外部数据的运行时字段检查。
  if (card.effect.kind === 'resource' && (card.effect.resource === undefined || card.effect.amount === undefined)) {
    report.errors.push(`${label}：resource 效果缺少 resource 或 amount，结算时会被忽略`);
  }
  if (card.tags.length === 0) {
    report.errors.push(`${label}：缺少标签，无法进入成长画像`);
    return;
  }
  // 一张牌的所有标签都没被桥接，它对起手身份的推导没有任何贡献。
  if (getMemoryTags(card).length === 0) {
    report.errors.push(`${label}：标签 ${JSON.stringify(card.tags)} 全部未被桥接，这张牌不会进入任何成长画像`);
  }
  // 单个标签失配不影响运行，属于v1叙事标签向五类画像迁移的已知欠账。
  for (const tag of card.tags) {
    if (!isRecognizedTagSignal(tag)) {
      report.warnings.push(`${label}：标签「${tag}」未被 TAG_SIGNALS 桥接到五类成长画像`);
    }
  }
}

function checkAdultEvent(event: AdultEvent, report: Report): void {
  const label = `成年事件 ${event.id}`;
  if (!Number.isInteger(event.afterChapter) || event.afterChapter < 0 || event.afterChapter >= CHAPTERS.length) {
    report.errors.push(`${label}：afterChapter ${event.afterChapter} 超出 0–${CHAPTERS.length - 1}`);
  }
  if (event.choices.length < 2) report.errors.push(`${label}：至少需要 2 个选择，当前为 ${event.choices.length}`);
  for (const duplicate of findDuplicates(event.choices.map((choice) => choice.id))) {
    report.errors.push(`${label}：选择 id 重复「${duplicate}」`);
  }
  for (const choice of event.choices) {
    if (choice.memoryRequirement && (choice.memoryRequirement.choiceIds.length === 0 || choice.memoryRequirement.age >= event.age
      || !choice.memoryRequirement.choiceIds.every((id) => isKnownStoryChoice(`growth:${choice.memoryRequirement!.age}`, id)))) {
      report.errors.push(`${label} · ${choice.id}：引用了不存在的童年选择`);
    }
    if (choice.upgradeMemoryAge !== undefined && !GROWTH_EVENTS.some((item) => item.age === choice.upgradeMemoryAge)) {
      report.errors.push(`${label} · ${choice.id}：没有对应年龄的记忆可以淬炼`);
    }
    // takeOne 对空数组会返回 undefined，并被非空断言吞掉。
    if (choice.outcomes.length === 0) report.errors.push(`${label} · ${choice.id}：outcomes 不能为空`);
    if (choice.requirement && choice.requirement.min < 0) {
      report.errors.push(`${label} · ${choice.id}：requirement.min 不能为负`);
    }
  }
}

export function validateContent(): ContentValidationResult {
  const report: Report = { errors: [], warnings: [] };

  // 正式章节
  for (const duplicate of findDuplicates(CHAPTERS.map((chapter) => chapter.id))) {
    report.errors.push(`正式章节 id 重复「${duplicate}」`);
  }
  CHAPTERS.forEach((chapter, index) => {
    checkChapter(chapter, `正式章节 ${chapter.id}`, report);
    const previous = CHAPTERS[index - 1];
    if (previous && chapter.year <= previous.year) {
      report.errors.push(`正式章节 ${chapter.id}：年龄 ${chapter.year} 未晚于上一章的 ${previous.year}`);
    }
  });

  // 成人原型章节：三个身份共用同一套规则与意图
  for (const identity of STARTING_IDENTITIES) {
    checkChapter(getPrototypeChapter(identity.id), `原型章节 ${identity.id}`, report);
  }

  // 童年成长事件
  ALL_GROWTH_EVENTS.forEach((event, index) => {
    const label = `童年事件 ${event.age} 岁`;
    const previous = GROWTH_EVENTS[index - 1];
    if (index < GROWTH_EVENTS.length && previous && event.age <= previous.age) {
      report.errors.push(`${label}：年龄未晚于上一事件的 ${previous.age} 岁`);
    }
    if (event.choices.length < 2) report.errors.push(`${label}：至少需要 2 个选择，当前为 ${event.choices.length}`);
    for (const duplicate of findDuplicates(event.choices.map((choice) => choice.id))) {
      report.errors.push(`${label}：选择 id 重复「${duplicate}」`);
    }
    for (const choice of event.choices) {
      // 两者都由 takeOne 抽取，空数组会产出 undefined 卡牌或 undefined 代价。
      if (choice.cards.length === 0) report.errors.push(`${label} · ${choice.id}：cards 不能为空`);
      if (choice.costs.length === 0) report.errors.push(`${label} · ${choice.id}：costs 不能为空`);
      choice.cards.forEach((card, cardIndex) => {
        checkCard(card, `${label} · ${choice.id} · 奖励牌${cardIndex + 1}「${card.title}」`, report);
      });
    }
  });

  for (const { event, requirement } of GROWTH_CONTINUATIONS) {
    if (requirement.age >= event.age || !requirement.choiceIds.every((id) => isKnownStoryChoice(`growth:${requirement.age}`, id))) {
      report.errors.push(`童年回响「${event.title}」必须引用已经发生的有效选择`);
    }
  }

  // 出身底牌
  const options = originOptions();
  const originCard = makeOriginCard(makeOrigin(
    'FL-0000-000', options.places[0]!, options.households[0]!, options.textures[0]!, options.keepsakes[0]!,
  ));
  checkCard(originCard, `出身底牌「${originCard.title}」`, report);

  // 成年生活事件
  for (const duplicate of findDuplicates(ADULT_EVENTS.map((event) => event.id))) {
    report.errors.push(`成年事件 id 重复「${duplicate}」`);
  }
  for (const event of ADULT_EVENTS) checkAdultEvent(event, report);
  for (let afterChapter = 0; afterChapter < CHAPTERS.length; afterChapter += 1) {
    // buildAdultSchedule 每章固定抽 2 个，池子不足会安静地少排事件。
    const pool = BASE_ADULT_EVENTS.filter((event) => event.afterChapter === afterChapter);
    if (pool.length < ADULT_EVENTS_PER_CHAPTER) {
      report.errors.push(`第 ${afterChapter} 章之后只有 ${pool.length} 个成年事件，排程需要至少 ${ADULT_EVENTS_PER_CHAPTER} 个`);
    }
  }
  const grantedMarkIds = new Set(
    ADULT_EVENTS.flatMap((event) => event.choices.map((choice) => choice.mark?.id).filter((id): id is string => Boolean(id))),
  );
  for (const event of ADULT_EVENTS) {
    for (const choice of event.choices) {
      if (choice.removeMark && !grantedMarkIds.has(choice.removeMark)) {
        report.errors.push(`成年事件 ${event.id} · ${choice.id}：removeMark「${choice.removeMark}」没有任何选择会授予`);
      }
    }
  }

  // 成人原型牌组
  for (const duplicate of findDuplicates(PROTOTYPE_CARDS.map((card) => card.id))) {
    report.errors.push(`原型记忆牌 id 重复「${duplicate}」`);
  }
  for (const card of PROTOTYPE_CARDS) checkCard(card, `原型记忆牌「${card.title}」`, report);
  if (PROTOTYPE_DECK_IDS.length !== DECK_SIZE) {
    report.errors.push(`原型应对组必须为 ${DECK_SIZE} 张，当前为 ${PROTOTYPE_DECK_IDS.length} 张`);
  }
  const prototypeCardIds = new Set(PROTOTYPE_CARDS.map((card) => card.id));
  for (const cardId of PROTOTYPE_DECK_IDS) {
    if (!prototypeCardIds.has(cardId)) report.errors.push(`原型应对组引用了不存在的记忆牌「${cardId}」`);
  }

  // 身份被动必须真的能被内容触发，否则是一条写在界面上却永远不生效的规则。
  const allCards: CardShape[] = [
    ...ALL_GROWTH_EVENTS.flatMap((event) => event.choices.flatMap((choice) => choice.cards)),
    ...PROTOTYPE_CARDS,
    originCard,
  ];
  const reachableMemoryTags = new Set(allCards.flatMap((card) => getMemoryTags(card)));
  for (const identity of STARTING_IDENTITIES) {
    if (identity.passive.kind !== 'card-tag') continue;
    if (!reachableMemoryTags.has(identity.passive.tag)) {
      report.errors.push(`身份 ${identity.id} 的被动依赖「${identity.passive.tag}」标签，但没有任何记忆牌能产生该标签`);
    }
  }

  // 时代气候
  for (const duplicate of findDuplicates(WORLD_CLIMATES.map((climate) => climate.id))) {
    report.errors.push(`时代气候 id 重复「${duplicate}」`);
  }

  return { valid: report.errors.length === 0, errors: report.errors, warnings: report.warnings };
}
