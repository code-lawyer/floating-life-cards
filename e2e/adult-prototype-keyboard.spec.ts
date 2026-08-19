import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function focusByKeyboard(page: Page, accessibleName: string) {
  for (let step = 0; step < 20; step += 1) {
    await page.keyboard.press('Tab');
    const focusedName = await page.locator(':focus').getAttribute('aria-label');
    const focusedText = (await page.locator(':focus').textContent())?.trim();
    if (focusedName === accessibleName || focusedText === accessibleName) return;
  }
  throw new Error(`键盘未能聚焦「${accessibleName}」`);
}

test('玩家只用键盘就能选择身份、完成教学并唤起第一张记忆牌', async ({ page }) => {
  await page.goto('/?playtest=adult-prototype');
  await expect(page.getByRole('heading', { name: '成年困局规则试玩' })).toBeVisible();
  await expect(page.getByRole('button', { name: '登记出生' })).toHaveCount(0);
  await focusByKeyboard(page, '以名校毕业生开始原型');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '合同上没有写的事' })).toBeVisible();

  await focusByKeyboard(page, '去看我的手牌');
  await page.keyboard.press('Enter');
  const hand = page.getByRole('region', { name: '这一次，你拿哪段自己来回答？' });
  await expect(hand).toBeFocused();

  await page.keyboard.press('Tab');
  expect(await page.locator(':focus').evaluate((element) => element.tagName)).toBe('BUTTON');
  await expect(page.locator(':focus')).toHaveAccessibleName(/^唤起.+牌力 \d+，守势 \d+$/);
  await expect(page.locator(':focus')).toHaveAccessibleDescription(/预计得分\s*\d+\s*对\s*\d+/);
  await page.keyboard.press('Enter');

  await expect(page.getByRole('heading', { name: '先看结果，再学下一条' })).toBeVisible();
  await expect(page.getByText(/上一轮 · \d+ : \d+/)).toBeVisible();
});
