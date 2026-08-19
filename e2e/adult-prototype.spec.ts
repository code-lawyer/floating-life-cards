import { expect, test } from '@playwright/test';

test('玩家能以职校技术员完成合同困局并用同一身份重试', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /浮生\s*牌局/ })).toBeVisible();

  await page.getByRole('button', { name: '以职校技术员开始原型' }).click();
  await expect(page.getByRole('heading', { name: '合同上没有写的事' })).toBeVisible();
  await expect(page.getByRole('region', { name: '起手身份' })).toContainText('职校技术员');

  await page.getByRole('button', { name: '去看我的手牌' }).click();
  const hand = page.getByRole('region', { name: '这一次，你拿哪段自己来回答？' });
  await expect(hand).toBeFocused();

  const retry = page.getByRole('button', { name: '用职校技术员再试一次' });
  for (let round = 0; round < 5 && !await retry.isVisible(); round += 1) {
    await hand.getByRole('button', { name: /^唤起「/ }).first().click();
    const continueTutorial = page.getByRole('button', { name: '知道了，继续' });
    if (await continueTutorial.isVisible()) await continueTutorial.click();
  }

  await expect(page.getByRole('heading', { name: /这一次，世界让了一步|你没有赢，但故事没有停/ })).toBeVisible();
  await expect(retry).toBeVisible();
  await expect(page.locator('.round-ledger > div').first()).toBeVisible();

  await retry.click();
  await expect(page.getByRole('region', { name: '起手身份' })).toContainText('职校技术员');
  await expect(page.getByText('第 1 / 5 轮')).toBeVisible();
  await expect(page.getByText('0 / 12')).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
