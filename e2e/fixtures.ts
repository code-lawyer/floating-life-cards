import { expect, test as base } from '@playwright/test';

type RuntimeAudit = {
  consoleErrors: string[];
  pageErrors: string[];
};

export const test = base.extend<{ runtimeAudit: RuntimeAudit }>({
  runtimeAudit: [async ({ page }, use, testInfo) => {
    const audit: RuntimeAudit = { consoleErrors: [], pageErrors: [] };
    page.on('console', (message) => {
      if (message.type() === 'error') audit.consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => audit.pageErrors.push(error.message));

    await use(audit);

    if (audit.consoleErrors.length > 0 || audit.pageErrors.length > 0) {
      await testInfo.attach('runtime-errors', {
        body: JSON.stringify(audit, null, 2),
        contentType: 'application/json',
      });
    }
    expect.soft(audit.consoleErrors, '浏览器不应产生console.error').toEqual([]);
    expect.soft(audit.pageErrors, '页面不应产生未处理异常').toEqual([]);
  }, { auto: true }],
});

export { expect };
