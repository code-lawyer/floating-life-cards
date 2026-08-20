import { expect, test } from './fixtures';
import { expectDecodedImage, expectMinimumTouchTarget, expectTouchEnvironment } from './mobile-assertions';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

test('窄屏横屏保持触摸输入、可读画面和44像素主要操作', async ({ page }) => {
  await page.goto('/?playtest=adult-prototype');
  await expectTouchEnvironment(page);
  const start = page.getByRole('button', { name: '以职校技术员开始原型' });
  await expectMinimumTouchTarget(start);
  await start.click();
  await expectDecodedImage(page.getByRole('img', { name: '成年牌局「合同上没有写的事」的现场' }));
  await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 844);
});
