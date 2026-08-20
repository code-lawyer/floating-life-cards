import { _electron as electron, expect, test } from '@playwright/test';
import path from 'node:path';

test('Windows桌面构建可启动并进入正式故事', async ({}, testInfo) => {
  const executablePath = path.resolve('desktop-release', 'FloatingLifeCards-win32-x64', '浮生牌局.exe');
  const userDataDir = testInfo.outputPath('clean-user-data');
  const application = await electron.launch({ executablePath, args: [`--user-data-dir=${userDataDir}`] });
  try {
    const window = await application.firstWindow();
    await expect(window.getByRole('heading', { name: /浮生\s+牌局/ })).toBeVisible();
    await expect(window.getByRole('img', { name: '童年记忆与成年档案交叠的城市书桌' })).toBeVisible();
    await window.getByRole('button', { name: '登记出生' }).click();
    await expect(window.getByRole('heading', { name: '你只是一个普通人' })).toBeVisible();
  } finally {
    await application.close();
  }
});
