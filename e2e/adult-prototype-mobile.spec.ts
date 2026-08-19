import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('390像素玩家能进入灵活就业者困局并用童年余温召回记忆', async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.getByRole('button', { name: '以名校毕业生开始原型' })).toBeVisible();
  await expect(page.getByRole('button', { name: '以职校技术员开始原型' })).toBeVisible();
  await expect(page.getByRole('button', { name: '以灵活就业者开始原型' })).toBeVisible();
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 390);

  await page.getByRole('button', { name: '以灵活就业者开始原型' }).click();
  await expect(page.getByRole('heading', { name: '合同上没有写的事' })).toBeVisible();
  await expect(page.getByText('平台服务中心 · 下午 16:40')).toBeVisible();
  await expect(page.getByRole('region', { name: '起手身份' })).toContainText('灵活就业者');

  await page.getByRole('button', { name: '去看我的手牌' }).click();
  const hand = page.getByRole('region', { name: '这一次，你拿哪段自己来回答？' });
  await expect(hand).toBeFocused();
  await hand.getByRole('button', { name: /^唤起「/ }).first().click();
  await page.getByRole('button', { name: '知道了，继续' }).click();

  const warmth = page.getByRole('region', { name: '童年余温' });
  const recall = warmth.getByRole('button', { name: /召回/ }).first();
  await expect(recall).toBeVisible();
  const recalledTitle = (await recall.getAttribute('aria-label'))?.replace(/^召回「|」$/g, '');
  expect(recalledTitle).toBeTruthy();
  await recall.click();

  await expect(warmth.getByRole('status')).toContainText('童年余温已用');
  await expect(warmth).toContainText(`「${recalledTitle}」`);
  await expect(warmth).toContainText(/\d+ 岁/);
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 390);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
