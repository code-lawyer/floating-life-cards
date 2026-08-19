import { getStartingIdentity } from '../src/game/identities';
import { analyzePrototype, type PrototypeOutcomeEnvelope } from '../src/game/prototypeAnalysis';
import type { StartingIdentityId } from '../src/game/types';

const IDENTITY_IDS: StartingIdentityId[] = ['elite-graduate', 'technical-worker', 'gig-worker'];

function yesNo(value: boolean): string {
  return value ? '是' : '否';
}

function toolReachability(outcome: PrototypeOutcomeEnvelope, tool: 'warmth' | 'redraw'): string {
  const withTool = tool === 'warmth' ? outcome.winWithWarmth : outcome.winWithRedraw;
  const withoutTool = tool === 'warmth' ? outcome.winWithoutWarmth : outcome.winWithoutRedraw;
  return `用 ${yesNo(withTool)} / 不用 ${yesNo(withoutTool)}`;
}

const reports = IDENTITY_IDS.map(analyzePrototype);
const lines = [
  '# 成人原型决策空间分析',
  '',
  '> 穷举结果只寻找数值死路，不代表真实玩家概率或乐趣。',
  '',
  '| 起手身份 | 状态数 | 推进范围 | 最短胜利 | 可失败 | 可耗尽心气 | 胜利使用余温 | 胜利使用换手 |',
  '| --- | ---: | ---: | ---: | --- | --- | --- | --- |',
];

for (const report of reports) {
  const title = getStartingIdentity(report.identityId)!.title;
  lines.push(`| ${title} | ${report.statesExplored} | ${report.outcome.worstProgress}–${report.outcome.bestProgress} | ${report.outcome.shortestWinRounds ?? '不可胜'} 轮 | ${yesNo(report.outcome.canLose)} | ${yesNo(report.outcome.canExhaustHeart)} | ${toolReachability(report.outcome, 'warmth')} | ${toolReachability(report.outcome, 'redraw')} |`);
}

for (const report of reports) {
  const title = getStartingIdentity(report.identityId)!.title;
  lines.push('', `## ${title}的固定开局`, '', '| 第一个动作 | 可胜 | 可败 | 推进范围 | 最短胜利 |', '| --- | --- | --- | ---: | ---: |');
  for (const option of report.openingOptions) {
    lines.push(`| ${option.label} | ${yesNo(option.outcome.canWin)} | ${yesNo(option.outcome.canLose)} | ${option.outcome.worstProgress}–${option.outcome.bestProgress} | ${option.outcome.shortestWinRounds ?? '不可胜'} 轮 |`);
  }
}

lines.push('', '## 自动警戒', '');
for (const report of reports) {
  const title = getStartingIdentity(report.identityId)!.title;
  const viableOpenings = report.openingOptions.filter((option) => option.outcome.canWin).length;
  const warmthOptional = report.outcome.winWithWarmth && report.outcome.winWithoutWarmth;
  lines.push(`- ${title}：${viableOpenings}/${report.openingOptions.length} 个开局动作保留胜法；童年余温${warmthOptional ? '可参与且非强制' : '需要检查可用性'}。`);
}

console.log(lines.join('\n'));
