import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * 旅程用例验证完整五章。新故事在启程时有最低心气休整，后续仍允许提前
 * 结卷，因此允许有限重开；固定种子的回响旅程另有不重试的专项用例。
 */
const MAX_LIFE_ATTEMPTS = 6;

/** 应用把当前阶段写在根节点的 `app--<phase>` 上，用它驱动旅程比逐屏猜测稳定。 */
async function currentPhase(page: Page): Promise<string> {
  const className = await page.locator('.app').getAttribute('class');
  return /app--([\w-]+)/.exec(className ?? '')?.[1] ?? '';
}

/**
 * 旅程推进信号。同一场牌局里连续出牌不会改变阶段，因此签名还要带上
 * 轮次、推进值与手牌，才能覆盖出牌、换手和召回三种都停留在 encounter 的动作。
 */
async function progressSignature(page: Page): Promise<string> {
  const phase = await currentPhase(page);
  if (phase !== 'encounter') return phase;
  const round = await page.locator('.progress-block small').innerText();
  const progress = await page.locator('.progress-block b').innerText();
  const hand = await page.locator('.hand-option .life-card h3').allInnerTexts();
  return `${phase}|${round}|${progress}|${hand.join(',')}`;
}

async function waitForHand(page: Page): Promise<void> {
  await expect(page.locator('.hand-zone')).toBeVisible();
  await expect(page.locator('.hand-option, .hand-grid__empty').first()).toBeVisible();
}

/** 按界面公开的预计比分挑最优手牌；盲选首张会让心气更早耗尽。 */
async function playBestCard(page: Page): Promise<void> {
  await waitForHand(page);
  const coachSkip = page.getByRole('button', { name: '跳过教学' });
  if (await coachSkip.isVisible().catch(() => false)) {
    await coachSkip.click();
    await waitForHand(page);
  }

  const options = page.locator('.hand-option');
  const count = await options.count();
  if (count === 0) {
    await page.getByRole('button', { name: /^换一手/ }).click();
    return;
  }

  let bestIndex = 0;
  let bestMargin = -Infinity;
  for (let index = 0; index < count; index += 1) {
    const scores = options.nth(index).locator('.score-preview b');
    const player = Number(await scores.nth(0).innerText());
    const world = Number(await scores.nth(1).innerText());
    if (player - world > bestMargin) {
      bestMargin = player - world;
      bestIndex = index;
    }
  }
  await options.nth(bestIndex).locator('.life-card').click();
}

async function advanceOneStep(page: Page, phase: string): Promise<void> {
  switch (phase) {
    case 'title':
      await page.getByRole('button', { name: '登记出生' }).click();
      return;
    case 'origin':
      await page.getByRole('button', { name: '收下这份出身' }).click();
      return;
    case 'growth':
      await page.getByLabel('选择你的做法').locator('button').first().click();
      return;
    case 'growth-result':
      await page.locator('.result-screen .primary-button').click();
      return;
    case 'deck':
      await page.getByRole('button', { name: '十八岁，确认行囊' }).click();
      return;
    case 'identity':
      await page.getByRole('button', { name: '以这个起点进入成年牌局' }).click();
      return;
    case 'interlude':
      await page.getByRole('button', { name: /^带上这八张牌/ }).click();
      return;
    case 'encounter':
      await playBestCard(page);
      return;
    case 'encounter-result':
      await page.locator('.encounter-result .primary-button').click();
      return;
    case 'adult-event':
      await page.locator('.adult-choice:not([disabled])').first().click();
      return;
    case 'adult-result':
      await page.getByRole('button', { name: '继续往下生活' }).click();
      return;
    default:
      throw new Error(`未知阶段：${phase}`);
  }
}

/** 清掉上一条人生的存档，用一颗新种子重新出生。 */
async function startFreshLife(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: '登记出生' })).toBeVisible();
}

async function runToEnding(page: Page): Promise<{ phases: Set<string>; chapters: number }> {
  const phases = new Set<string>();
  let steps = 0;
  let phase = await currentPhase(page);

  // 步数上限只用来防止界面卡死造成无限循环，正常旅程远低于它。
  while (phase !== 'ending' && steps < 200) {
    phases.add(phase);
    const before = await progressSignature(page);
    await advanceOneStep(page, phase);
    await expect
      .poll(async () => await progressSignature(page), { timeout: 15_000 })
      .not.toBe(before);
    phase = await currentPhase(page);
    steps += 1;
  }
  expect(phase, `${steps} 步后仍未到达结局`).toBe('ending');
  phases.add('ending');

  const attempted = await page.locator('.ending-stats div').first().locator('dd').innerText();
  return { phases, chapters: Number(attempted.split('/')[1]!.trim()) };
}

test('正式故事可以从出生一路走到结局，并结算全部五场世界牌局', async ({ page }) => {
  test.setTimeout(300_000);

  let result: { phases: Set<string>; chapters: number } | null = null;
  for (let attempt = 0; attempt < MAX_LIFE_ATTEMPTS; attempt += 1) {
    await startFreshLife(page);
    result = await runToEnding(page);
    if (result.chapters === 5) break;
  }

  expect(result!.chapters, `${MAX_LIFE_ATTEMPTS} 条人生都没有走完五章`).toBe(5);

  // 走完全程的人生必须真的经过每一个正式阶段，而不是被某条捷径跳过。
  for (const required of ['title', 'origin', 'growth', 'growth-result', 'deck', 'identity', 'encounter', 'encounter-result', 'adult-event', 'adult-result', 'interlude', 'ending']) {
    expect(result!.phases, `完整旅程未经过 ${required} 阶段`).toContain(required);
  }
  await expect(page.getByRole('button', { name: '再活一次' })).toBeVisible();
});

test('刷新页面后从本地存档恢复到同一场世界牌局的同一轮', async ({ page }) => {
  test.setTimeout(180_000);

  // 心气在童年耗尽时，第一张牌就会让牌局结算，那样没有“局中刷新”可测；换一条人生重来。
  for (let attempt = 0; attempt < MAX_LIFE_ATTEMPTS; attempt += 1) {
    await startFreshLife(page);
    await page.getByRole('button', { name: '登记出生' }).click();
    await page.getByRole('button', { name: '收下这份出身' }).click();
    for (let year = 0; year < 14; year += 1) {
      await page.getByLabel('选择你的做法').locator('button').first().click();
      await page.locator('.result-screen .primary-button').click();
    }
    await page.getByRole('button', { name: '十八岁，确认行囊' }).click();
    await page.getByRole('button', { name: '以这个起点进入成年牌局' }).click();

    // 先打一张，让存档里带上非空的回忆堆、出牌记录与推进值。
    await playBestCard(page);
    if (await currentPhase(page) === 'encounter') break;
  }

  expect(await currentPhase(page), '没有取得一条能在牌局中途刷新的人生').toBe('encounter');
  await expect(page.locator('.round-note')).toBeVisible();

  const chapterTitle = await page.locator('.encounter-header h1').innerText();
  const progress = await page.locator('.progress-block b').innerText();
  const round = await page.locator('.progress-block small').innerText();
  const roundNote = await page.locator('.round-note span').innerText();
  const handTitles = await page.locator('.hand-option .life-card h3').allInnerTexts();
  expect(handTitles.length).toBeGreaterThan(0);

  await page.reload();

  expect(await currentPhase(page)).toBe('encounter');
  await expect(page.locator('.encounter-header h1')).toHaveText(chapterTitle);
  await expect(page.locator('.progress-block b')).toHaveText(progress);
  await expect(page.locator('.progress-block small')).toHaveText(round);
  await expect(page.locator('.round-note span')).toHaveText(roundNote);
  expect(await page.locator('.hand-option .life-card h3').allInnerTexts()).toEqual(handTitles);
});
