import { expect, test } from './fixtures';
import { expectMinimumTouchTarget, expectTouchEnvironment } from './mobile-assertions';
import { simulateStory } from '../src/game/storySimulation';
import type { GameState } from '../src/game/types';

const states: GameState[] = [];
simulateStory(1, { strategy: 'careful', onState: (state) => states.push(state) });
const checkpoint = states.find((state) => state.phase === 'encounter' && state.encounter!.chapterIndex === 1)!;

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test.describe(`${viewport.width}像素辅助操作`, () => {
    test.use({ viewport, hasTouch: true });
    test('牌力说明、换手与设置在触摸下可读、可点且支持键盘关闭', async ({ page }) => {
      await page.addInitScript((initial) => localStorage.setItem('floating-life-cards.save.v7', JSON.stringify(initial)), checkpoint);
      await page.goto('/');
      await expectTouchEnvironment(page);
      const redraw = page.getByRole('button', { name: /^换一手/ });
      await expectMinimumTouchTarget(redraw);
      const breakdown = page.locator('.score-breakdown summary').first();
      await expectMinimumTouchTarget(breakdown);
      await breakdown.tap();
      await expect(page.locator('.score-breakdown').first()).toHaveJSProperty('open', true);
      if (await page.getByRole('button', { name: '设置', exact: true }).isVisible()) {
        await page.getByRole('button', { name: '设置', exact: true }).tap();
      } else {
        await page.getByRole('button', { name: '菜单', exact: true }).tap();
        await page.getByRole('button', { name: /叙事设置/ }).tap();
      }
      const close = page.getByRole('button', { name: '关闭设置' });
      await expectMinimumTouchTarget(close);
      await page.getByText('开发者接入：连接 LLM 叙事裁判', { exact: true }).tap();
      await expectMinimumTouchTarget(page.getByRole('button', { name: '测试端点', exact: true }));
      const contract = page.locator('.endpoint-contract summary');
      await expectMinimumTouchTarget(contract);
      await contract.tap();
      await expect(page.locator('.endpoint-contract')).toHaveJSProperty('open', true);
      expect(await page.locator('html').evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
      await redraw.tap();
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('floating-life-cards.save.v7')!).encounter.redrawUsed)).toBe(true);
    });
  });
}
