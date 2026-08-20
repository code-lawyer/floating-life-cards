# Windows v1.5.0 内部发布候选验收

日期：2026-08-19

## 产物

- 安装器：`windows-installer/浮生牌局-Setup.exe`
- 发布清单：`windows-installer/RELEASE-MANIFEST.txt`
- 免安装目录：`desktop-release/FloatingLifeCards-win32-x64/`
- 主程序：`desktop-release/FloatingLifeCards-win32-x64/浮生牌局.exe`
- EXE产品版本 / 文件版本：`1.5.0`

安装器不会提交到Git；`RELEASE-MANIFEST.txt` 是本地候选产物的一部分，记录实际字节数、SHA-256、精确源码提交和版本标签。打包脚本会拒绝无标签、版本不匹配或存在未提交改动的工作树，避免旧安装器与新源码产生不可审计的“假候选”。本次界面收口候选来源标签为 `v1.5.0-rc.3`。

## 已执行

- `npm run verify`：13个Vitest文件、94项测试，生产构建和5条浏览器旅程全部通过；
- 1440桌面、960窄桌面与390手机真实渲染复验：正式首页无测试入口、童年无选择缩略图、成年首屏可同时看到世界牌与手牌、页面无横向溢出；
- Electron绿色合成块缓解：移除所有标题图 `mask-image` 合成层，场景改用无蒙版的去色混合背景；
- 1000个确定性完整人生：三身份可达、章节有胜有负、资源0–9、无状态锁死；
- `npm run desktop:make`：Windows x64目录与Squirrel安装器成功生成；
- `npm run test:desktop`：Playwright真实启动打包后的EXE并进入正式故事，1项通过；
- [GitHub Quality gate #32342575029](https://github.com/code-lawyer/floating-life-cards/actions/runs/32342575029)：`v1.5.0-rc.3` 对应提交的依赖安装、Chromium安装、测试、构建和5条浏览器旅程全部通过；
- Authenticode检查：`NotSigned`，与当前内部候选声明一致。

## 公开发布阻断

- 尚未取得Windows代码签名证书；
- 尚未在干净Windows账户实际执行安装、存档恢复、覆盖升级与卸载矩阵；
- 因此当前产物可供内部试玩和制作验收，不能标记为已完成公开发布。
