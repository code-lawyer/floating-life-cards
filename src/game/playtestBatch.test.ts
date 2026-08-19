import { describe, expect, it } from 'vitest';
import { validatePlaytestBatch } from './playtestBatch';

function objectiveRecord(id: string, identity: string, firstMemory: string, version = '1.4.0'): string {
  return `# 《浮生牌局》成年困局试玩客观记录

- 构建版本：${version}
- 匿名记录编号（主持人填写）：${id}
- 试玩身份：${identity}
- 原型种子：616628206
- 结果：越过局面
- 推进：13 / 12
- 回合：3 / 5

## 逐轮事实

| 轮次 | 世界意图 | 唤起记忆 | 分数 | 结果 |
| ---: | --- | --- | ---: | --- |
| 1 | 先说清楚这不是裁员 | ${firstMemory} | 7 : 4 | 推进 |
| 2 | 只给十分钟考虑 | 给同桌留的半句话 | 5 : 5 | 僵持 |
| 3 | 当场签字 | 自己修好的车链 | 8 : 6 | 推进 |
`;
}

describe('真人试玩批次校验', () => {
  it('接受同版本、编号与身份各自完整的三份客观记录', () => {
    const result = validatePlaytestBatch([
      { fileName: 'P1-01-elite.md', markdown: objectiveRecord('P1-01', '名校毕业生', '第一次举手') },
      { fileName: 'P1-02-technical.md', markdown: objectiveRecord('P1-02', '职校技术员', '自己修好的车链') },
      { fileName: 'P1-03-gig.md', markdown: objectiveRecord('P1-03', '灵活就业者', '雨里认过的路') },
    ]);

    expect(result).toEqual({
      valid: true,
      version: '1.4.0',
      errors: [],
      records: [
        { fileName: 'P1-01-elite.md', id: 'P1-01', identity: '名校毕业生', rounds: 3 },
        { fileName: 'P1-02-technical.md', id: 'P1-02', identity: '职校技术员', rounds: 3 },
        { fileName: 'P1-03-gig.md', id: 'P1-03', identity: '灵活就业者', rounds: 3 },
      ],
    });
  });

  it('拒绝不足三份的客观记录批次', () => {
    const result = validatePlaytestBatch([
      { fileName: 'P1-01-elite.md', markdown: objectiveRecord('P1-01', '名校毕业生', '第一次举手') },
      { fileName: 'P1-02-technical.md', markdown: objectiveRecord('P1-02', '职校技术员', '自己修好的车链') },
    ]);

    expect(result).toMatchObject({
      valid: false,
      errors: ['需要3份客观记录，当前找到2份。'],
    });
  });

  it('拒绝混入不同构建版本的记录', () => {
    const result = validatePlaytestBatch([
      { fileName: 'P1-01-elite.md', markdown: objectiveRecord('P1-01', '名校毕业生', '第一次举手') },
      { fileName: 'P1-02-technical.md', markdown: objectiveRecord('P1-02', '职校技术员', '自己修好的车链') },
      { fileName: 'P1-03-gig.md', markdown: objectiveRecord('P1-03', '灵活就业者', '雨里认过的路', '1.4.1') },
    ]);

    expect(result).toMatchObject({
      valid: false,
      version: null,
      errors: ['构建版本不一致：1.4.0、1.4.1。'],
    });
  });

  it('拒绝匿名编号重复或缺失的批次', () => {
    const result = validatePlaytestBatch([
      { fileName: 'first.md', markdown: objectiveRecord('P1-01', '名校毕业生', '第一次举手') },
      { fileName: 'second.md', markdown: objectiveRecord('P1-01', '职校技术员', '自己修好的车链') },
      { fileName: 'third.md', markdown: objectiveRecord('P1-03', '灵活就业者', '雨里认过的路') },
    ]);

    expect(result).toMatchObject({
      valid: false,
      errors: ['匿名记录编号必须各出现一次：P1-01、P1-02、P1-03。'],
    });
  });

  it('拒绝起手身份重复或缺失的批次', () => {
    const result = validatePlaytestBatch([
      { fileName: 'P1-01.md', markdown: objectiveRecord('P1-01', '名校毕业生', '第一次举手') },
      { fileName: 'P1-02.md', markdown: objectiveRecord('P1-02', '职校技术员', '自己修好的车链') },
      { fileName: 'P1-03.md', markdown: objectiveRecord('P1-03', '职校技术员', '雨里认过的路') },
    ]);

    expect(result).toMatchObject({
      valid: false,
      errors: ['试玩身份必须各出现一次：名校毕业生、职校技术员、灵活就业者。'],
    });
  });

  it('拒绝声明回合数与逐轮事实行数不一致的记录', () => {
    const incomplete = objectiveRecord('P1-02', '职校技术员', '自己修好的车链')
      .replace('| 3 | 当场签字 | 自己修好的车链 | 8 : 6 | 推进 |\n', '');
    const result = validatePlaytestBatch([
      { fileName: 'P1-01.md', markdown: objectiveRecord('P1-01', '名校毕业生', '第一次举手') },
      { fileName: 'P1-02.md', markdown: incomplete },
      { fileName: 'P1-03.md', markdown: objectiveRecord('P1-03', '灵活就业者', '雨里认过的路') },
    ]);

    expect(result).toMatchObject({
      valid: false,
      errors: ['P1-02.md：声明3回合，但逐轮事实只有2行。'],
    });
  });

  it('指出缺少构建版本的具体记录', () => {
    const missingVersion = objectiveRecord('P1-03', '灵活就业者', '雨里认过的路')
      .replace('- 构建版本：1.4.0\n', '');
    const result = validatePlaytestBatch([
      { fileName: 'P1-01.md', markdown: objectiveRecord('P1-01', '名校毕业生', '第一次举手') },
      { fileName: 'P1-02.md', markdown: objectiveRecord('P1-02', '职校技术员', '自己修好的车链') },
      { fileName: 'P1-03.md', markdown: missingVersion },
    ]);

    expect(result).toMatchObject({
      valid: false,
      version: null,
      errors: ['P1-03.md：缺少构建版本。'],
    });
  });

  it('拒绝逐轮事实中缺少意图、记忆、分数或结果的行', () => {
    const incompleteRow = objectiveRecord('P1-02', '职校技术员', '自己修好的车链')
      .replace('| 2 | 只给十分钟考虑 | 给同桌留的半句话 | 5 : 5 | 僵持 |', '| 2 | 只给十分钟考虑 |  | 5 : 5 | 僵持 |');
    const result = validatePlaytestBatch([
      { fileName: 'P1-01.md', markdown: objectiveRecord('P1-01', '名校毕业生', '第一次举手') },
      { fileName: 'P1-02.md', markdown: incompleteRow },
      { fileName: 'P1-03.md', markdown: objectiveRecord('P1-03', '灵活就业者', '雨里认过的路') },
    ]);

    expect(result).toMatchObject({
      valid: false,
      errors: ['P1-02.md：第2回合的逐轮事实字段不完整。'],
    });
  });
});
