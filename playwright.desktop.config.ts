import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './desktop-e2e',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
});
