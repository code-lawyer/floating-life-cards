export type StaticSceneVisualId = 'origin' | 'growth-archive' | 'contract-table' | 'deck' | 'ending';
export type SceneVisualId = StaticSceneVisualId | `growth-${number}` | `chapter-${string}` | `adult-${string}`;
export type SceneTone = 'childhood' | 'threshold' | 'adult' | 'aftermath';

export interface SceneVisual {
  id: SceneVisualId;
  src: string;
  alt: string;
  caption: string;
  desktopPosition: string;
  mobilePosition: string;
  tone: SceneTone;
}

interface VisualLayout {
  desktopPosition: string;
  mobilePosition: string;
}

const VISUAL_LAYOUTS: readonly VisualLayout[] = [
  { desktopPosition: '50% 50%', mobilePosition: '48% 54%' },
  { desktopPosition: '52% 47%', mobilePosition: '58% 51%' },
  { desktopPosition: '48% 53%', mobilePosition: '43% 58%' },
  { desktopPosition: '54% 49%', mobilePosition: '62% 55%' },
];

function layoutFor(index: number): VisualLayout {
  return VISUAL_LAYOUTS[index % VISUAL_LAYOUTS.length]!;
}

function makeVisual(visual: Omit<SceneVisual, keyof VisualLayout>, layout: VisualLayout): SceneVisual {
  return { ...visual, ...layout };
}

const SCENE_VISUALS: Record<StaticSceneVisualId, SceneVisual> = {
  origin: makeVisual({ id: 'origin', src: './art/origin-key-art-v1.webp', alt: '清晨门口等待上学的旧书包', caption: '人生档案 00 · 故事还没有替你命名', tone: 'childhood' }, layoutFor(1)),
  'growth-archive': makeVisual({ id: 'growth-archive', src: './art/growth-key-art-v1.webp', alt: '课后教室里同时发生的三种选择', caption: '成长档案 · 同一局面会留下不同的办法', tone: 'childhood' }, layoutFor(0)),
  'contract-table': makeVisual({ id: 'contract-table', src: './art/contract-key-art-v1.webp', alt: '签字倒计时前摆在桌上的合同与工作装备', caption: '成年困局 · 世界已经把问题放到桌上', tone: 'adult' }, layoutFor(3)),
  deck: makeVisual({ id: 'deck', src: './art/deck-key-art-v1.webp', alt: '从十四年童年档案中挑出八段随身记忆', caption: '十八岁 · 你开始决定哪些办法值得继续相信', tone: 'threshold' }, layoutFor(2)),
  ending: makeVisual({ id: 'ending', src: './art/ending-key-art-v1.webp', alt: '旧档案围着一本仍有许多空白页的人生册', caption: '人生档案 · 暂时结卷，不是停止生长', tone: 'aftermath' }, layoutFor(1)),
};

export function getSceneVisual(id: StaticSceneVisualId): SceneVisual {
  return SCENE_VISUALS[id];
}

export function getGrowthSceneVisual(age: number, title: string): SceneVisual {
  if (!Number.isInteger(age) || age < 4 || age > 17) throw new Error(`没有为 ${age} 岁配置成长剧情视觉`);
  return makeVisual({
    id: `growth-${age}`,
    src: `./art/growth-${String(age).padStart(2, '0')}-v1.webp`,
    alt: `${age} 岁「${title}」：这个局面的三种选择`,
    caption: `成长档案 ${String(age).padStart(2, '0')} · 同一局面会留下不同的办法`,
    tone: 'childhood',
  }, layoutFor(age - 4));
}

const CHAPTER_IDS = ['first-job', 'city', 'trust', 'turning', 'proposal', 'contract-terms'] as const;
const CHAPTER_ART: Record<(typeof CHAPTER_IDS)[number], string> = {
  'first-job': './art/chapter-first-job-v1.webp', city: './art/chapter-city-v1.webp', trust: './art/chapter-trust-v1.webp',
  turning: './art/chapter-turning-v1.webp', proposal: './art/chapter-proposal-v1.webp', 'contract-terms': './art/contract-key-art-v1.webp',
};

function chapterIndex(chapterId: string): number {
  const index = CHAPTER_IDS.indexOf(chapterId as (typeof CHAPTER_IDS)[number]);
  if (index < 0) throw new Error(`没有为成年牌局 ${chapterId} 配置剧情视觉`);
  return index;
}

export function getChapterSceneVisual(chapterId: string, title: string): SceneVisual {
  const index = chapterIndex(chapterId);
  return makeVisual({
    id: `chapter-${chapterId}`,
    src: CHAPTER_ART[chapterId as (typeof CHAPTER_IDS)[number]],
    alt: `成年牌局「${title}」的现场`, caption: `成年牌局 · ${title}`, tone: 'adult',
  }, layoutFor(index));
}

export function getChapterResultSceneVisual(chapterId: string, title: string): SceneVisual {
  const visual = getChapterSceneVisual(chapterId, title);
  return { ...visual, id: `chapter-${chapterId}-result`, alt: `成年牌局「${title}」的结案现场`, caption: `结案档案 · ${title}`, tone: 'aftermath' };
}

const ADULT_EVENT_VISUAL_IDS = [
  'first-salary', 'friend-loan', 'night-class', 'lease-renewal', 'checkup', 'outside-offer', 'parent-call',
  'relationship-crossroad', 'empty-week', 'team-cut', 'friend-startup', 'hometown-flat', 'mentor-young', 'study-again', 'care-years',
] as const;

export function getAdultEventSceneVisual(eventId: string, age: number, title: string): SceneVisual {
  // The same objects recur across a life; these plates are deliberate visual callbacks.
  const echoArt: Record<string, string> = {
    'repair-call': './art/growth-09-v1.webp',
    'old-classmate': './art/adult-relationship-crossroad-v1.webp',
  };
  if (echoArt[eventId]) return makeVisual({
    id: `adult-${eventId}`, src: echoArt[eventId], alt: `${age} 岁「${title}」的旧事回响`,
    caption: '旧事回响 · 同一段记忆，到了不同的人生现场', tone: 'adult',
  }, layoutFor(eventId === 'repair-call' ? 1 : 2));
  const index = ADULT_EVENT_VISUAL_IDS.indexOf(eventId as (typeof ADULT_EVENT_VISUAL_IDS)[number]);
  if (index < 0) throw new Error(`没有为成年事件 ${eventId} 配置剧情视觉`);
  return makeVisual({
    id: `adult-${eventId}`, src: `./art/adult-${eventId}-v1.webp`,
    alt: `${age} 岁「${title}」：这个局面的三种选择`, caption: `成年生活档案 ${age} · 选择会留下新的生活状态`, tone: 'adult',
  }, layoutFor(index));
}
