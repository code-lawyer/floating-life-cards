import { expect, type Locator, type Page } from '@playwright/test';

export async function expectTouchEnvironment(page: Page) {
  expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
}

export async function expectMinimumTouchTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box, '触控目标必须可见').not.toBeNull();
  expect(box!.width, '触控目标宽度至少44px').toBeGreaterThanOrEqual(44);
  expect(box!.height, '触控目标高度至少44px').toBeGreaterThanOrEqual(44);
}

export async function expectDecodedImage(locator: Locator) {
  await expect(locator).toHaveJSProperty('complete', true);
  expect(await locator.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
}
