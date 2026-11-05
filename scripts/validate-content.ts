import { validateContent } from '../src/game/contentValidation';

const result = validateContent();

if (result.warnings.length > 0) {
  console.warn(`内容漂移提醒 ${result.warnings.length} 项（不阻塞，属于v1叙事标签迁移欠账）：`);
  for (const warning of result.warnings) console.warn(`- ${warning}`);
  console.warn('');
}

if (!result.valid) {
  console.error(`游戏内容校验未通过，共 ${result.errors.length} 项：`);
  for (const error of result.errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('游戏内容校验通过：章节轮次、事件排程、卡牌效果、标签桥接与原型牌组均自洽。');
}
