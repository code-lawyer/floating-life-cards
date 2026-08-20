const { app, BrowserWindow } = require('electron');
const path = require('node:path');

const isDevelopment = !app.isPackaged;

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
