import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures';

test.use({ viewport: { width: 390, height: 844 } });

test('390像素玩家能用童年余温完成困局并在结案下载记录', async ({ page }) => {
  await page.goto('/?playtest=adult-prototype');
  await expect(page.getByRole('heading', { name: '成年困局规则试玩' })).toBeVisible();
  await expect(page.getByRole('button', { name: '登记出生' })).toHaveCount(0);
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
  await hand.getByRole('button', { name: /^唤起/ }).first().click();
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

  const download = page.getByRole('link', { name: '下载本局试玩记录' });
  for (let round = 1; round < 5 && !await download.isVisible(); round += 1) {
    await hand.getByRole('button', { name: /^唤起/ }).first().click();
  }
  await expect(download).toBeVisible();
  await expect(download).toHaveAttribute('download', '浮生牌局-灵活就业者-试玩记录.md');
  const downloadPromise = page.waitForEvent('download');
  await download.click();
  const downloadedRecord = await downloadPromise;
  const downloadedPath = await downloadedRecord.path();
  expect(downloadedPath).not.toBeNull();
  const recordText = await readFile(downloadedPath!, 'utf8');
  expect(recordText).toContain('- 试玩身份：灵活就业者');
  expect(recordText).toMatch(/- 构建版本：\d+\.\d+\.\d+/);
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 390);
});
