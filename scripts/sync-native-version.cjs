const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const version = require(path.join(root, 'package.json')).version;
const targets = [
  {
    path: path.join(root, 'android', 'app', 'build.gradle'),
    pattern: /versionName "[^"]+"/,
    replacement: `versionName "${version}"`,
  },
  {
    path: path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj'),
    pattern: /MARKETING_VERSION = [^;]+;/g,
    replacement: `MARKETING_VERSION = ${version};`,
  },
];

for (const target of targets) {
  const source = fs.readFileSync(target.path, 'utf8');
  const updated = source.replace(target.pattern, target.replacement);
  if (updated === source && !source.includes(target.replacement)) {
    throw new Error(`无法在 ${target.path} 中同步版本 ${version}`);
  }
  fs.writeFileSync(target.path, updated);
}

process.stdout.write(`Native version synchronized to ${version}.\n`);
