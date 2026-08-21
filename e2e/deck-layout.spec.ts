import { expect, test } from './fixtures';

type DeckViewport = {
  width: number;
  height: number;
  label: string;
};

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
    { width: 390, height: 844, label: '手机竖屏' },
    { width: 844, height: 390, label: '窄屏横屏' },
  ] satisfies DeckViewport[]) {
    test(viewport.label + '的操作区、分类栏和牌阵不重叠', async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await reachDeckBuilder(page);

      const action = page.locator('.deck-screen .sticky-action');
      const filters = page.locator('.deck-screen .deck-filters');
      const rules = page.locator('.deck-screen .deck-rules');
      const targets = [filters, rules, page.locator('.deck-family').first()];
      for (const target of targets) {
        await target.scrollIntoViewIfNeeded();
        const [actionBox, targetBox] = await Promise.all([action.boundingBox(), target.boundingBox()]);
        expect(actionBox).not.toBeNull();
        expect(targetBox).not.toBeNull();
        const overlaps = actionBox!.x < targetBox!.x + targetBox!.width
          && actionBox!.x + actionBox!.width > targetBox!.x
          && actionBox!.y < targetBox!.y + targetBox!.height
          && actionBox!.y + actionBox!.height > targetBox!.y;
        expect(overlaps, viewport.label + ' 操作区不应覆盖 ' + await target.getAttribute('class')).toBe(false);
      }

      await page.getByRole('link', { name: '回到确认区' }).scrollIntoViewIfNeeded();
      await page.getByRole('link', { name: '回到确认区' }).click();
      await expect(action).toBeInViewport();

      const selectedSlots = page.locator('.deck-slot:not(.deck-slot--empty)');
      while (await selectedSlots.count() > 0) await selectedSlots.first().click();
      await expect(page.getByRole('button', { name: '十八岁，确认行囊' })).toBeDisabled();
      await expect(action).toContainText('还需选择 8 张');
      await page.getByRole('button', { name: '恢复均衡建议' }).click();
      await expect(page.getByRole('button', { name: '十八岁，确认行囊' })).toBeEnabled();
      await expect(page.locator('.deck-slot:not(.deck-slot--empty)')).toHaveCount(8);

      await page.getByRole('button', { name: /^洞察\s*\d+$/ }).click();
      await expect(page.getByRole('button', { name: /^洞察\s*\d+$/ })).toHaveAttribute('aria-pressed', 'true');
      await page.locator('.deck-rules summary').click();
      await expect(page.locator('.deck-rules')).toHaveJSProperty('open', true);

      const firstRowCards = await page.locator('.deck-family .deck-grid').first().locator('.life-card').evaluateAll((cards) => {
        const firstTop = cards[0]?.getBoundingClientRect().top;
        return cards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstTop) < 2).length;
      });
      expect(firstRowCards).toBeLessThanOrEqual(4);
      expect(await page.locator('html').evaluate((html) => html.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    });
  }
});
