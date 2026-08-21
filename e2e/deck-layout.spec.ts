import { expect, test } from './fixtures';

async function reachDeckBuilder(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '登记出生' }).click();
  await page.getByRole('button', { name: '收下这份出身' }).click();

  for (let year = 0; year < 14; year += 1) {
    await page.getByLabel('选择你的做法').locator('button').first().click();
    await page.locator('.result-screen .primary-button').click();
  }

  await expect(page.getByRole('heading', { name: '世界不问你准备好了没有' })).toBeVisible();
}

test.describe('十八岁组牌页布局', () => {
  for (const viewport of [
    { width: 2560, height: 1440, label: '超宽桌面' },
    { width: 1440, height: 900, label: '标准桌面' },
  ]) {
    test(viewport.label + '的操作区、分类栏和牌阵不重叠', async ({ page }) => {
      await page.setViewportSize(viewport);
      await reachDeckBuilder(page);

      const action = page.locator('.deck-screen .sticky-action');
      const filters = page.locator('.deck-screen .deck-filters');
      const rules = page.locator('.deck-screen .deck-rules');
      await action.scrollIntoViewIfNeeded();

      const [actionBox, filtersBox, rulesBox] = await Promise.all([
        action.boundingBox(),
        filters.boundingBox(),
        rules.boundingBox(),
      ]);
      expect(actionBox).not.toBeNull();
      expect(filtersBox).not.toBeNull();
      expect(rulesBox).not.toBeNull();
      expect(actionBox!.y + actionBox!.height).toBeLessThanOrEqual(filtersBox!.y);
      expect(filtersBox!.y + filtersBox!.height).toBeLessThanOrEqual(rulesBox!.y);

      const firstRowCards = await page.locator('.deck-family .deck-grid').first().locator('.life-card').evaluateAll((cards) => {
        const firstTop = cards[0]?.getBoundingClientRect().top;
        return cards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstTop) < 2).length;
      });
      expect(firstRowCards).toBeLessThanOrEqual(4);
      await expect(page.locator('html')).toHaveJSProperty('scrollWidth', viewport.width);
    });
  }
});
