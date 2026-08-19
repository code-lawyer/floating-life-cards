# 浮生牌局

一款完全由文字、排版和手牌构成的浏览器人生冒险。玩家以普通人的身份出生，从 4 岁到 17 岁每年做出一次选择，获得一张与选择有关的成长牌并承担随机代价；18 岁后，从自己的记忆中挑出 8 张牌，与工作、城市、信任、行业变化和人生选择对局。

## 运行

需要 Node.js 22.12 或更高版本。

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址。首次运行浏览器端到端测试需要安装受控Chromium：

```bash
npx playwright install chromium
npm run verify
```

`npm run verify` 会依次运行49项规则/组件测试、生产构建和3条成人原型浏览器旅程。也可以分别使用 `npm test`、`npm run build` 和 `npm run test:e2e`。

制作阶段可运行 `npm run analyze:prototype`，穷举三个起手身份在固定合同困局中的合法决策空间。该命令只寻找明显数值死路，不代表真人胜率或乐趣。

游戏不依赖后端，默认离线可玩，进度自动存入浏览器 `localStorage`。

## 玩法速览

- 出身：随机生成一份没有特殊加成的普通人档案，并得到固定底牌「普通人的底牌」。
- 成长：4–17 岁共 14 个事件。每次从洞察、行动、共情三种做法中选择，获得对应牌，随后揭晓资源代价。
- 组牌：成年时从 15 张记忆牌中带 8 张上路。
- 成年生活：每局从 15 个事件中抽取 10 个，穿插工资、居所、健康、关系、工作、家庭和重新学习等选择。
- 对局：世界每轮打出一种局面，玩家从手牌中选择回应。行动克洞察、洞察克共情、共情克行动。
- 变化机制：每场随机时代气候、人生状态、卡牌熟练升级、同型连用与三式组合，以及每局一次换手。
- 结局：五场成年局面允许失败；胜负、心气和成长倾向共同决定终局。失败改变故事，不要求读档。

当前版本的完整策划见 [docs/GAME_DESIGN.md](./docs/GAME_DESIGN.md)，实现边界见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

下一版本正在围绕“动态童年、成年起手身份与永久记忆牌”重新设计。已确认的产品边界、玩法方案、内容规范、技术迁移和路线图见 [docs/v2/README.md](./docs/v2/README.md)。

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
    game.ts          唯一游戏规则模块与状态机
    judge.ts         本地 / 远程叙事裁判适配器
    playtestRecord.ts 成人原型匿名试玩记录格式化
    persistence.ts   版本化本地存档
    rng.ts           可复现随机数
    types.ts         共享领域类型
  App.tsx            阶段页面和玩家交互
  styles.css         纯文字档案视觉系统
e2e/                 Playwright玩家旅程
docs/
  GAME_DESIGN.md
  ARCHITECTURE.md
  LLM_JUDGE.md
scripts/
  judge-server.mjs  本地安全 LLM 中转示例
playwright.config.ts 浏览器测试与开发服务器编排
```
