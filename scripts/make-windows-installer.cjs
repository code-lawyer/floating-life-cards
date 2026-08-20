const { createWindowsInstaller } = require('electron-winstaller');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(projectRoot, 'windows-installer');
const packageJson = require(path.join(projectRoot, 'package.json'));

function git(...args) {
  return execFileSync('git', ['-c', `safe.directory=${projectRoot.replace(/\\/g, '/')}`, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function releaseSource() {
  const changes = git('status', '--porcelain', '--untracked-files=all');
  if (changes) throw new Error('发布安装器只能从无未提交改动的Git工作树构建。');
  const commit = git('rev-parse', 'HEAD');
  const tag = git('describe', '--exact-match', '--tags', 'HEAD');
  const allowedTags = new RegExp(`^v${packageJson.version.replace(/\./g, '\\.')}(-rc\\.\\d+)?$`);
  if (!allowedTags.test(tag)) {
    throw new Error(`当前标签 ${tag || '（无）'} 与包版本 ${packageJson.version} 不匹配。`);
  }
  return { commit, tag };
}

const source = releaseSource();
fs.rmSync(outputDirectory, { recursive: true, force: true });

createWindowsInstaller({
  appDirectory: path.join(projectRoot, 'desktop-release', 'FloatingLifeCards-win32-x64'),
  outputDirectory,
  authors: '浮生牌局制作组',
  exe: '浮生牌局.exe',
  description: '人生故事与选择卡牌游戏',
  setupIcon: path.join(projectRoot, 'assets', 'app-icon.ico'),
  noMsi: true,
}).then(() => {
  const releaseSetup = path.join(outputDirectory, '浮生牌局-Setup.exe');
  const generatedSetup = fs.readdirSync(outputDirectory)
    .find((name) => name.toLowerCase().endsWith('setup.exe'));
  if (!generatedSetup) throw new Error('安装器完成后没有找到 Setup.exe');
  if (generatedSetup !== path.basename(releaseSetup)) {
    fs.renameSync(path.join(outputDirectory, generatedSetup), releaseSetup);
  }
  const setupBytes = fs.readFileSync(releaseSetup);
  const sha256 = crypto.createHash('sha256').update(setupBytes).digest('hex').toUpperCase();
  const manifest = [
    `product=浮生牌局`,
    `version=${packageJson.version}`,
    `source_tag=${source.tag}`,
    `source_commit=${source.commit}`,
    `source_tree=clean`,
    `artifact=浮生牌局-Setup.exe`,
    `artifact_bytes=${setupBytes.byteLength}`,
    `sha256=${sha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(outputDirectory, 'RELEASE-MANIFEST.txt'), manifest, 'utf8');
  process.stdout.write(`Windows安装包：${releaseSetup}\n`);
  process.stdout.write(`发布清单：${path.join(outputDirectory, 'RELEASE-MANIFEST.txt')}\n`);
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
