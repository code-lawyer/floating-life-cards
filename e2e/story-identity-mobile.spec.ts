import { expect, test } from './fixtures';
import { expectDecodedImage, expectMinimumTouchTarget, expectTouchEnvironment } from './mobile-assertions';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('正式故事在童年后展示系统生成的起手身份再进入世界牌局', async ({ page }) => {
  await page.goto('/');
  await expectTouchEnvironment(page);
  const begin = page.getByRole('button', { name: '登记出生' });
  await expectMinimumTouchTarget(begin);
  await begin.click();
  await page.getByRole('button', { name: '收下这份出身' }).click();
  await expectDecodedImage(page.locator('.growth-screen .scene-art img'));

  for (let year = 0; year < 14; year += 1) {
    const choices = page.getByLabel('选择你的做法');
    await expect(choices).toBeVisible();
    await choices.locator('button').first().click();
    await page.locator('.result-screen .primary-button').click();
  }

  await expect(page.getByRole('heading', { name: '世界不问你准备好了没有' })).toBeVisible();
  await page.getByRole('button', { name: '十八岁，确认行囊' }).click();

  await expect(page.getByRole('heading', { name: /你以「.+」进入成年/ })).toBeVisible();
  const reasons = page.getByRole('region', { name: '起手身份形成原因' });
  await expect(reasons).toContainText('系统生成，不是人生等级');
  await expect(reasons.locator('li')).toHaveCount(3);
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 390);

  const enterAdult = page.getByRole('button', { name: '以这个起点进入成年牌局' });
  await expectMinimumTouchTarget(enterAdult);
  await enterAdult.click();
  await expect(page.getByRole('heading', { name: '没有经验的人' })).toBeVisible();
  await expect(page.locator('.encounter-context > summary')).toContainText(/名校毕业生|职校技术员|灵活就业者/);
});
