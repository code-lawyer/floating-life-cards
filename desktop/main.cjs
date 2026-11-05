const { app, BrowserWindow } = require('electron');
const path = require('node:path');

const isDevelopment = !app.isPackaged;

// Squirrel 会启动应用来处理安装、升级和卸载；这些进程不能进入游戏。
function handleSquirrelEvent() {
  if (process.platform !== 'win32') return false;
  const event = process.argv[1];
  if (event === '--squirrel-obsolete') {
    app.quit();
    return true;
  }
  const operation = event === '--squirrel-install' || event === '--squirrel-updated'
    ? '--createShortcut'
    : event === '--squirrel-uninstall' ? '--removeShortcut' : null;
  if (!operation) return false;

  const { spawn } = require('node:child_process');
  const updaterPath = path.resolve(path.dirname(process.execPath), '..', 'Update.exe');
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    app.quit();
  };
  // 给安装器预留退出时间；助手缺失、报错或卡住时也不打开窗口。
  const timeout = setTimeout(finish, 10_000);
  try {
    const updater = spawn(updaterPath, [operation, path.basename(process.execPath)], {
      windowsHide: true,
      stdio: 'ignore',
    });
    updater.once('error', finish);
    updater.once('close', finish);
  } catch {
    finish();
  }
  return true;
}

function createMainWindow() {
  const window = new BrowserWindow({
    title: '浮生牌局',
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#17213b',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });
  window.once('ready-to-show', () => window.show());
  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  if (isDevelopment && process.env.FUSHENG_DEVTOOLS === '1') {
    window.webContents.openDevTools({ mode: 'detach' });
  }
}

if (!handleSquirrelEvent()) {
  app.whenReady().then(() => {
    app.setAppUserModelId('com.fusheng.cards');
    createMainWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
