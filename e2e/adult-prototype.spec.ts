import { expect, test } from './fixtures';

test('玩家能以职校技术员完成合同困局、复制客观记录并用同一身份重试', async ({ context, page }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1:4173' });
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
    await hand.getByRole('button', { name: /^唤起/ }).first().click();
    const continueTutorial = page.getByRole('button', { name: '知道了，继续' });
    if (await continueTutorial.isVisible()) await continueTutorial.click();
  }

  await expect(page.getByRole('heading', { name: /这一次，世界让了一步|你没有赢，但故事没有停/ })).toBeVisible();
  await expect(retry).toBeVisible();
  await expect(page.locator('.round-ledger > div').first()).toBeVisible();

  await page.getByRole('button', { name: '复制本局试玩记录' }).click();
  await expect(page.getByRole('status')).toContainText('本局记录已复制');
  const copiedRecord = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiedRecord).toContain('# 《浮生牌局》成年困局试玩客观记录');
  expect(copiedRecord).toContain('- 试玩身份：职校技术员');
  expect(copiedRecord).toContain('不包含试玩者姓名、联系方式或访谈回答');
  expect(copiedRecord).toMatch(/\| 1 \| .+ \| .+ \| \d+ : \d+ \| (推进|僵持|受挫) \|/);

  await retry.click();
  await expect(page.getByRole('region', { name: '起手身份' })).toContainText('职校技术员');
  await expect(page.getByText('第 1 / 5 轮')).toBeVisible();
  await expect(page.getByText('0 / 12')).toBeVisible();
});
