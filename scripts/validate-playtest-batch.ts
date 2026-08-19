import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validatePlaytestBatch } from '../src/game/playtestBatch';

async function main(): Promise<void> {
  const directoryArgument = process.argv[2];
  if (!directoryArgument) {
    console.error('用法：npm run validate:playtest -- <试玩证据目录>');
    process.exitCode = 1;
    return;
  }

  const directory = resolve(directoryArgument);
  const entries = await readdir(directory, { withFileTypes: true });
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
  const inputs = await Promise.all(markdownFiles.map(async (entry) => ({
    fileName: entry.name,
    markdown: await readFile(resolve(directory, entry.name), 'utf8'),
  })));
  const result = validatePlaytestBatch(inputs);

  if (!result.valid) {
    console.error('真人试玩批次无效：');
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`真人试玩批次有效：构建版本 ${result.version}`);
  for (const record of result.records) {
    console.log(`- ${record.id}｜${record.identity}｜${record.rounds}回合｜${record.fileName}`);
  }
}

main().catch((error: unknown) => {
  console.error(`无法校验试玩批次：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
