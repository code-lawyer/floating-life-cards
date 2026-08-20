const { packager } = require('@electron/packager');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const stageRoot = path.join(projectRoot, 'desktop-stage');
if (path.dirname(stageRoot) !== projectRoot) throw new Error('桌面暂存目录越出项目边界');

fs.rmSync(stageRoot, { recursive: true, force: true });
fs.mkdirSync(path.join(stageRoot, 'desktop'), { recursive: true });
fs.cpSync(path.join(projectRoot, 'dist'), path.join(stageRoot, 'dist'), { recursive: true });
fs.copyFileSync(path.join(projectRoot, 'desktop', 'main.cjs'), path.join(stageRoot, 'desktop', 'main.cjs'));
fs.writeFileSync(path.join(stageRoot, 'package.json'), JSON.stringify({
  name: 'floating-life-cards-desktop',
  productName: '浮生牌局',
  version: require(path.join(projectRoot, 'package.json')).version,
  main: 'desktop/main.cjs',
}, null, 2));

const releaseRoot = path.join(projectRoot, 'desktop-release');
const appDirectory = path.join(releaseRoot, 'FloatingLifeCards-win32-x64');
const electronVersion = require(path.join(projectRoot, 'node_modules', 'electron', 'package.json')).version;
const electronZipName = `electron-v${electronVersion}-win32-x64.zip`;

function findElectronZipDir() {
  const explicit = process.env.ELECTRON_ZIP_DIR;
  if (explicit && fs.existsSync(path.join(explicit, electronZipName))) return explicit;
  const cacheRoot = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'electron', 'Cache') : null;
  if (!cacheRoot || !fs.existsSync(cacheRoot)) return null;
  if (fs.existsSync(path.join(cacheRoot, electronZipName))) return cacheRoot;
  for (const entry of fs.readdirSync(cacheRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && fs.existsSync(path.join(cacheRoot, entry.name, electronZipName))) {
      return path.join(cacheRoot, entry.name);
    }
  }
  return null;
}

async function packageWindows() {
  if (path.dirname(releaseRoot) !== projectRoot) throw new Error('桌面发布目录越出项目边界');
  fs.rmSync(releaseRoot, { recursive: true, force: true });
  const electronZipDir = findElectronZipDir();
  if (electronZipDir) process.stdout.write(`使用已校验版本名的Electron ${electronVersion}本地缓存。\n`);
  await packager({
    dir: stageRoot,
    name: 'FloatingLifeCards',
    executableName: '浮生牌局',
    platform: 'win32',
    arch: 'x64',
    electronVersion,
    ...(electronZipDir ? { electronZipDir } : {}),
    out: releaseRoot,
    overwrite: false,
    prune: false,
    asar: true,
    icon: path.join(projectRoot, 'assets', 'app-icon.ico'),
    appBundleId: 'com.fusheng.cards',
    win32metadata: {
      CompanyName: '浮生牌局制作组',
      FileDescription: '人生故事与选择卡牌游戏',
      ProductName: '浮生牌局',
      InternalName: 'FloatingLifeCards',
    },
  });
  process.stdout.write(`Windows可执行目录：${appDirectory}\n`);
}

packageWindows().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
