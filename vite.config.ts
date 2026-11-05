import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    watch: {
      // Windows 打包会写入被占用的运行时 DLL；生成目录不参与前端热更新。
      ignored: ['**/desktop-stage/**', '**/desktop-release/**', '**/windows-installer/**'],
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
  },
});
