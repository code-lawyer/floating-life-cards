import { simulateStory } from '../src/game/storySimulation';
import type { StorySimulationOptions } from '../src/game/storySimulation';
import { isValidGameState } from '../src/game/saveValidation';

const count = Number(process.argv[2] ?? 1000);
if (!Number.isInteger(count) || count < 1 || count > 10000) throw new Error('种子数量必须是1–10000的整数');
const scenarios: Array<{ name: string; options: StorySimulationOptions }> = [
  { name: '旧故事·无休整（基线）', options: { edition: 'classic', recovery: 'none' } },
  { name: '旧故事·心气补至3', options: { edition: 'classic', recovery: 'floor3' } },
  { name: '旧故事·心气增加2', options: { edition: 'classic', recovery: 'plus2' } },
  { name: '旧故事·心气补至4', options: { edition: 'classic', recovery: 'floor4' } },
  { name: '回响版本·混合策略', options: {} },
  { name: '回响版本·保守策略', options: { strategy: 'careful' } },
  { name: '回响版本·轮换选牌', options: { strategy: 'impulsive' } },
  { name: '每章换一张·混合策略', options: { repack: 'rotate' } },
];

console.log(`# 完整人生模拟（每组种子1–${count}）\n`);
console.log('固定自动策略只检验数值与可达性，不估算真人胜率、留存或乐趣。旧故事对照仅改变启程心气；新故事还包含条件事件，不能把其全部差异归因于休整。\n');
console.log('| 方案 | 零心气开局 | 首轮后结束 | 第三章前结束 | 五章完成 | 实际经历回响事件 |');
console.log('| --- | ---: | ---: | ---: | ---: | ---: |');
for (const scenario of scenarios) {
  let zero = 0, first = 0, early = 0, complete = 0, echoes = 0;
  const identities = new Set<string>();
  for (let seed = 1; seed <= count; seed += 1) {
    const result = simulateStory(seed, scenario.options);
    if (!isValidGameState(result.state, 'story')) throw new Error(`${scenario.name} / ${seed} 生成非法终局`);
    if (result.adultStartHeart === 0) zero += 1;
    if (result.endedFirstRound) first += 1;
    if (result.state.chapterResults.length < 3) early += 1;
    if (result.completedAllChapters) complete += 1;
    if (result.state.adultEventsResolved.some((id) => id === 'repair-call' || id === 'old-classmate')) echoes += 1;
    identities.add(result.state.startingIdentity!);
  }
  const percentage = (n: number) => `${(n * 100 / count).toFixed(1)}%`;
  console.log(`| ${scenario.name} | ${percentage(zero)} | ${percentage(first)} | ${percentage(early)} | ${percentage(complete)} | ${percentage(echoes)} |`);
  if (count >= 1000 && identities.size !== 3) throw new Error(`${scenario.name} 未覆盖三个起手身份`);
}
console.log('\n混合策略：偶数种子取最高即时牌分、奇数种子轮换手牌，成年选择按种子轮换。保守策略：取最高即时牌分，成年选择优先保留心气。轮换选牌：忽略预计比分，按种子与轮次选牌。三者均不主动换手或使用余温，不代表最优策略。');
console.log('前三组回响策略沿用原有八张。每章换一张组会在每个转换处，将最后一张随身牌换成按种子选出的另一张；只验证可玩性，不推荐盲目换牌。');
