/** 随身应对组容量，由规则、界面与内容/存档校验共同使用。 */
export const DECK_SIZE = 8;

export const ADULT_EVENTS_PER_CHAPTER = 2;

/** 资源不足时仍可继续生活；事实记录与回顾使用同一个选择标识和文案。 */
export const CONSTRAINT_FALLBACK = { id: 'constraint-fallback', verb: '先让现实替你决定' } as const;
