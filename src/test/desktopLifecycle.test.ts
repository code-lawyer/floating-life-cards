import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync(path.resolve('desktop/main.cjs'), 'utf8');

async function launch(flag?: string, spawnError = false) {
  const updater = new EventEmitter();
  const spawn = vi.fn(() => {
    if (spawnError) throw new Error('Update.exe unavailable');
    return updater;
  });
  const quit = vi.fn();
  const loadFile = vi.fn();
  const createWindow = vi.fn();
  class BrowserWindow {
    constructor() { createWindow(); }
    webContents = { setWindowOpenHandler: vi.fn(), on: vi.fn() };
    once = vi.fn();
    loadFile = loadFile;
  }
  const app = { isPackaged: true, whenReady: () => Promise.resolve(), setAppUserModelId: vi.fn(), on: vi.fn(), quit };
  const execPath = path.join(path.resolve('out'), 'app-1.5.0', '浮生牌局.exe');
  vm.runInNewContext(source, {
    require: (id: string) => {
      if (id === 'electron') return { app, BrowserWindow };
      if (id === 'node:path') return path;
      if (id === 'node:child_process') return { spawn };
      throw new Error(`Unexpected module: ${id}`);
    },
    __dirname: path.resolve('desktop'),
    process: { platform: 'win32', argv: [execPath, ...(flag ? [flag] : [])], execPath, env: {} },
    setTimeout, clearTimeout,
  });
  await Promise.resolve();
  return { updater, spawn, quit, loadFile, createWindow, execPath };
}

afterEach(() => vi.useRealTimers());

describe('Windows 安装生命周期', () => {
  it.each([
    ['--squirrel-install', '--createShortcut'],
    ['--squirrel-updated', '--createShortcut'],
    ['--squirrel-uninstall', '--removeShortcut'],
  ])('%s 只处理快捷方式，等待完成后退出，不创建游戏窗口', async (flag, operation) => {
    vi.useFakeTimers();
    const result = await launch(flag);
    expect(result.spawn).toHaveBeenCalledWith(
      path.resolve(path.dirname(result.execPath), '..', 'Update.exe'),
      [operation, '浮生牌局.exe'],
      expect.objectContaining({ windowsHide: true, stdio: 'ignore' }),
    );
    expect(result.createWindow).not.toHaveBeenCalled();
    expect(result.quit).not.toHaveBeenCalled();
    result.updater.emit('close', 0);
    expect(result.quit).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('旧版本退场时直接退出', async () => {
    const result = await launch('--squirrel-obsolete');
    expect(result.quit).toHaveBeenCalledOnce();
    expect(result.spawn).not.toHaveBeenCalled();
    expect(result.createWindow).not.toHaveBeenCalled();
  });

  it.each(['throw', 'error', 'timeout'])('更新助手发生 %s 时仍退出安装事件进程', async (failure) => {
    vi.useFakeTimers();
    const result = await launch('--squirrel-install', failure === 'throw');
    if (failure === 'error') result.updater.emit('error', new Error('spawn failed'));
    if (failure === 'timeout') await vi.advanceTimersByTimeAsync(10_000);
    expect(result.quit).toHaveBeenCalledOnce();
    expect(result.createWindow).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([undefined, '--squirrel-firstrun'])('普通启动与安装后的首次启动正常打开游戏：%s', async (flag) => {
    const result = await launch(flag);
    expect(result.createWindow).toHaveBeenCalledOnce();
    expect(result.loadFile).toHaveBeenCalledWith(path.resolve('dist/index.html'));
    expect(result.spawn).not.toHaveBeenCalled();
    expect(result.quit).not.toHaveBeenCalled();
  });
});
