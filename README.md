# 浮生牌局

当前 Windows 桌面测试候选 **v1.7.2-rc.2「重新上路」**：童年的具体选择会在成年回响，每章之间可以重新整理八张记忆，结局留下真实决定。终审进一步修复存档时序、叙事连接测试竞态和触控目标尺寸。v6原位续玩，v4/v5沿用原故事。见 [终审记录](./docs/production/FINAL_AUDIT_1_7_2.md)、[版本说明](./docs/v3/RELEASE_NOTES_1.7.2.md) 与 [GitHub Releases](https://github.com/code-lawyer/floating-life-cards/releases)。Windows包尚未代码签名；移动工程已同步，真机与商店发行仍待验收。

一款以人生故事、永久记忆牌和选择为核心的跨端叙事卡牌游戏。玩家以普通人的身份出生，从 4 岁到 17 岁每年留下一个选择和一张记忆牌；18 岁先得到由童年经历生成的起手身份，再带 8 张记忆与工作、城市、信任、行业变化和人生选择对局。当前界面以“档案里的电影静帧”为视觉方向，为每个成长事件、成年事件和世界牌局配置剧情画面。

## 运行

需要 Node.js 22.22.2–22.x、24.15.0–24.x，或 26.0.0 及以上版本；与锁定依赖一致的范围记录在 `package.json` 的 `engines` 字段中。可用 `npm ci --engine-strict` 强制检查，CI 会在三个支持分段的下界运行质量门。

```bash
npm ci
npm run dev
```

依赖版本全部带上下界，`npm ci` 会精确还原锁文件中的版本树；`npm install` 只在需要新增依赖时使用。

浏览器打开终端显示的本地地址。首次运行浏览器端到端测试需要安装受控Chromium：

```bash
npx playwright install chromium
npm run verify
```

`npm run verify` 会依次运行静态检查、规则/组件与1000种子平衡护栏、生产构建和20条真实浏览器旅程（含完整五章、两条童年到成年回响、章节换牌、旧存档迁移、刷新恢复、辅助操作，以及桌面、触摸竖屏与窄屏横屏）。构建同时检查游戏源码、制作脚本与浏览器/桌面测试的TypeScript类型。也可以分别使用 `npm run lint`、`npm test`、`npm run build` 和 `npm run test:e2e`。

静态检查使用 oxlint，规则见 `.oxlintrc.json`：报错项保持为零，另有少量告警标记已知可接受的写法（只追加列表的索引 key、用依赖当触发器的滚动副作用）。

`npm run validate:content` 单独校验游戏内容自洽性：章节轮次是否配齐世界意图、事件排程池是否够用、卡牌效果字段是否完整、记忆牌标签能否进入成长画像、原型牌组引用是否存在。同一组校验已作为单元测试进入质量门；该命令额外列出不阻塞的内容漂移提醒。

制作阶段可运行 `npm run analyze:prototype`，穷举三个起手身份在固定合同困局中的合法决策空间。该命令只寻找明显数值死路，不代表真人胜率或乐趣。

`npm run analyze:story` 使用八组完整人生策略、恢复与换牌方案比较开局、提前结卷与五章完成情况；可追加种子数量，例如 `npm run analyze:story -- 3000`。模拟调用正式规则，不代表真人体验。

游戏不依赖后端，默认离线可玩，进度自动存入本地 `localStorage`。

## 桌面与移动工程

Windows 10/11 x64：

```powershell
npm run desktop:run       # 构建并直接启动桌面版
npm run desktop:make      # 生成可执行目录和安装器
npm run test:desktop      # 真实启动打包后的exe
```

iOS 与 Android 共用同一套 React、规则、内容和视觉资产：

```powershell
npm run mobile:sync
```

该命令会从 `package.json` 同步原生版本号、构建 Web 资产并更新两个原生工程。Android 发布仍需 JDK/Android Studio/签名密钥；iOS 发布仍需 macOS/Xcode/Apple 开发者签名。完整三端计划与门槛见 [docs/v3/RELEASE_PLAN.md](./docs/v3/RELEASE_PLAN.md)。

## 局域网真人试玩

主持人在项目目录运行：

```powershell
npm run playtest
```

命令会先生成生产构建，再显示本机与同一局域网可访问的地址。阶段1成年原型必须在地址末尾加上 `?playtest=adult-prototype`；这个专用入口使用独立且绑定当前构建版本的原型存档，不会读取或覆盖正式故事，只显示三个固定身份。局域网手机若无法使用剪贴板，可在结案页直接下载带当前构建版本的Markdown记录。完整主持流程见 [docs/production/PLAYTEST_RUNBOOK.md](./docs/production/PLAYTEST_RUNBOOK.md)。

## 玩法速览

- 出身：随机生成一份没有特殊加成的普通人档案，并得到固定底牌「普通人的底牌」。
- 成长：4–17 岁共 14 个事件。每次从洞察、行动、共情三种做法中选择，获得对应牌，随后揭晓资源代价；事件与选择都有剧情图像。
- 组牌：成年时从 15 张记忆牌中带 8 张上路。回响故事在21、25、30、36岁下一章出发前，可以重新挑选八张；放回牌册的记忆、熟练与淬炼都不会消失。
- 起手身份：童年牌的学习、手艺、关系、担当、探索信号与三项成长倾向共同生成名校毕业生、职校技术员或灵活就业者，并展示三条形成原因。
- 成年生活：15 个基础事件与 2 个条件回响事件，每局安排 10 次生活选择。童年做过的事可以改变后续故事，并开启有真实代价的新回应。
- 对局：世界每轮打出一种局面，玩家从手牌中选择回应。行动克洞察、洞察克共情、共情克行动。
- 变化机制：每场随机时代气候、人生状态、卡牌熟练升级、同型连用与三式组合，以及每局一次换手。
- 结局：五场成年局面允许失败；胜负、心气和成长倾向共同决定终局，档案记录故事回响与实际换牌。失败改变故事，不要求读档。

当前版本的完整策划见 [docs/GAME_DESIGN.md](./docs/GAME_DESIGN.md)，实现边界见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

早期“动态童年、成年起手身份与永久记忆牌”方案见 [docs/v2/README.md](./docs/v2/README.md)；其中身份跳切与永久记忆循环已经进入当前正式主流程。

项目按正式游戏制作流程推进；当前阶段、完整系统地图、制作门槛、任务池和质量计划见 [docs/production/README.md](./docs/production/README.md)。

## 可选 LLM 叙事裁判

游戏已经附带一个安全的本地中转示例。另开一个 PowerShell 终端：

```powershell
$env:LLM_API_KEY="你的模型密钥"
$env:LLM_MODEL="你的模型名称"
$env:LLM_BASE_URL="https://你的模型服务/v1"
npm run judge
```

然后在游戏顶部打开“设置”，展开“开发者接入：连接 LLM 叙事裁判”，填写 `http://localhost:8787/judge` 并点击“测试端点”。数值结算、随机数和存档始终由本地引擎负责；端点失败或 5 秒超时会无缝退回本地文案。

不要将模型密钥直接填写到浏览器。完整配置、部署说明和自定义端点格式见 [docs/LLM_JUDGE.md](./docs/LLM_JUDGE.md)。

## 项目结构

```text
src/
  game/
    content.ts       成长事件、15 个成年事件、卡牌原型与成年章节
    story.ts         条件成长、成年回响、选择事实与个人结局
    storySimulation.ts 通过正式规则运行完整人生的制作分析器
    contentValidation.ts 内容自洽性校验（轮次、排程、效果字段、标签桥接）
    game.ts          唯一游戏规则模块与状态机
    judge.ts         本地 / 远程叙事裁判适配器
    playtestRecord.ts 成人原型匿名试玩记录格式化
    persistence.ts   版本化本地存档
    visuals.ts       剧情视觉注册与移动裁切焦点
    rng.ts           可复现随机数
    types.ts         共享领域类型
  screens/           十二个阶段页面，每个阶段一个模块
  components/        牌面、状态标签、模态外壳、页头、教学与手牌等共享部件
  App.tsx            会话编排：装载存档、维护裁判端点、按阶段映射页面
  styles.css         档案电影静帧视觉与桌面/移动响应式布局
desktop/             安全Electron桌面壳
android/             Capacitor Android工程
ios/                 Capacitor iOS工程
public/art/          运行时WebP剧情资产
e2e/                 Playwright玩家旅程
docs/
  GAME_DESIGN.md
  ARCHITECTURE.md
  LLM_JUDGE.md
scripts/
  judge-server.mjs  本地安全 LLM 中转示例
  validate-content.ts 内容校验命令行入口
.oxlintrc.json      静态检查规则
playwright.config.ts 浏览器测试与开发服务器编排
```
