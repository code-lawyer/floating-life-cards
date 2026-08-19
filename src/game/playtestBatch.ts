export interface PlaytestMarkdownRecord {
  fileName: string;
  markdown: string;
}

export interface PlaytestBatchRecord {
  fileName: string;
  id: string;
  identity: string;
  rounds: number;
}

export interface PlaytestBatchValidation {
  valid: boolean;
  version: string | null;
  errors: string[];
  records: PlaytestBatchRecord[];
}

const OBJECTIVE_RECORD_TITLE = '# 《浮生牌局》成年困局试玩客观记录';
const REQUIRED_RECORD_IDS = ['P1-01', 'P1-02', 'P1-03'];
const REQUIRED_IDENTITIES = ['名校毕业生', '职校技术员', '灵活就业者'];

function readField(markdown: string, label: string): string {
  return markdown.match(new RegExp(`^- ${label}：(.+)$`, 'm'))?.[1].trim() ?? '';
}

function readRoundCount(markdown: string): number {
  return Number(readField(markdown, '回合').split('/')[0].trim());
}

export function validatePlaytestBatch(inputs: PlaytestMarkdownRecord[]): PlaytestBatchValidation {
  const objectiveRecords = inputs.filter(({ markdown }) => markdown.startsWith(OBJECTIVE_RECORD_TITLE));
  const records = objectiveRecords.map(({ fileName, markdown }) => ({
    fileName,
    id: readField(markdown, '匿名记录编号（主持人填写）'),
    identity: readField(markdown, '试玩身份'),
    rounds: readRoundCount(markdown),
  }));
  const errors: string[] = [];
  if (objectiveRecords.length !== 3) {
    errors.push(`需要3份客观记录，当前找到${objectiveRecords.length}份。`);
  }
  const recordVersions = objectiveRecords.map(({ fileName, markdown }) => ({
    fileName,
    version: readField(markdown, '构建版本'),
  }));
  const missingVersions = recordVersions.filter(({ version }) => !version);
  for (const { fileName } of missingVersions) {
    errors.push(`${fileName}：缺少构建版本。`);
  }
  const versions = [...new Set(recordVersions.map(({ version }) => version).filter(Boolean))];
  if (missingVersions.length === 0 && versions.length > 1) {
    errors.push(`构建版本不一致：${versions.join('、')}。`);
  }
  const recordIds = records.map(({ id }) => id).sort();
  if (records.length === 3 && recordIds.join('\n') !== REQUIRED_RECORD_IDS.join('\n')) {
    errors.push(`匿名记录编号必须各出现一次：${REQUIRED_RECORD_IDS.join('、')}。`);
  }
  const identities = records.map(({ identity }) => identity).sort();
  const expectedIdentities = [...REQUIRED_IDENTITIES].sort();
  if (records.length === 3 && identities.join('\n') !== expectedIdentities.join('\n')) {
    errors.push(`试玩身份必须各出现一次：${REQUIRED_IDENTITIES.join('、')}。`);
  }
  for (const { fileName, markdown } of objectiveRecords) {
    const declaredRounds = readRoundCount(markdown);
    const factRows = markdown.match(/^\|\s*\d+\s*\|.*$/gm) ?? [];
    if (Number.isFinite(declaredRounds) && factRows.length !== declaredRounds) {
      errors.push(`${fileName}：声明${declaredRounds}回合，但逐轮事实只有${factRows.length}行。`);
    }
    for (const [index, row] of factRows.entries()) {
      const [round, intent, memory, score, outcome] = row.split('|').slice(1, -1).map((cell) => cell.trim());
      const complete = /^\d+$/.test(round)
        && Boolean(intent)
        && Boolean(memory)
        && /^\d+\s*:\s*\d+$/.test(score)
        && ['推进', '僵持', '受挫'].includes(outcome);
      if (!complete) {
        errors.push(`${fileName}：第${round || index + 1}回合的逐轮事实字段不完整。`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    version: missingVersions.length === 0 && versions.length === 1 ? versions[0] : null,
    errors,
    records,
  };
}
