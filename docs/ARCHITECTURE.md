# 技术设计

## 技术基线

- React + TypeScript + Vite，共享给 Web、Electron 与 Capacitor；
- Electron Windows x64 桌面壳；Capacitor iOS / Android 原生工程；
- 无路由、无后端、无运行时 UI 库；
- Vitest + Testing Library + Playwright；
- 浏览器 `localStorage` 版本化存档；
- 可注入的远程叙事裁判端点。

选择单页状态机，是因为完整一局只有一个线性档案上下文。URL 路由不会提供有意义的可分享状态，反而容易让玩家绕过阶段不变量。

## 核心深模块

`src/game/game.ts` 是规则深模块。它对调用者只暴露：

```ts
createGame(seed?): GameState
reduceGame(state, action): GameState
getGrowthEvent(state): GrowthEvent | null
getChapter(state): Chapter | null
getAdultEvent(state): AdultEvent | null
getAdultChoices(state): AdultEventChoice[]
getAdultChoiceBlockReason(state, choice): string | null
canBeginAdventure(state): boolean
canChooseAdultChoice(state, choice): boolean
approachRelation(card, intent): Relation
getWorldPower(state): number | null
getRedrawPressureCost(state): number
previewCardPlay(state, card): CombatPreview | null
```

成长抽取、成本、资源夹取、组牌、身份生成、洗牌、补牌、克制、效果、章节推进与结局选择都隐藏在这一个接口后。负向心气、余钱、人情变化在规则层自动成为真实成本；所有原选择都不可承担时，`getAdultChoices` 追加一个只增加压力的现实兜底，保证故事推进但不伪造支付。React 只渲染状态并派发玩家命令，不重新实现规则。手牌上的预计得分调用 `previewCardPlay`，真实出牌结算也调用同一函数，避免说明与规则漂移。测试与界面跨越的是同一条接缝。

## 状态机

```mermaid
stateDiagram-v2
  [*] --> title
  title --> origin: BEGIN
  title --> encounter: START_PROTOTYPE / fixed identity and seed
  origin --> origin: REROLL_ORIGIN
  origin --> growth: ACCEPT_ORIGIN
  growth --> growth-result: CHOOSE_GROWTH
  growth-result --> growth: CONTINUE_GROWTH / age < 17
  growth-result --> deck: CONTINUE_GROWTH / age = 17
  deck --> deck: TOGGLE_DECK / AUTO_DECK
  deck --> identity: CONFIRM_DECK / exactly 8 cards
  identity --> encounter: BEGIN_ADVENTURE / generated identity
  encounter --> encounter: PLAY_CARD / unresolved
  encounter --> encounter: REDRAW_HAND / once per encounter
  encounter --> encounter: RECALL_MEMORY / once per encounter, from memory pile
  encounter --> encounter-result: target, round limit, or exhaustion
  encounter-result --> encounter: RESTART_PROTOTYPE / prototype mode
  encounter-result --> adult-event: CONTINUE_ADVENTURE / scheduled life event
  adult-event --> adult-result: CHOOSE_ADULT_EVENT
  adult-result --> adult-event: CONTINUE_ADULT_EVENT / another event
  adult-result --> encounter: CONTINUE_ADULT_EVENT / next chapter
  adult-result --> ending: final scheduled event
  encounter-result --> ending: exhaustion
  ending --> title: RESTART
```

所有非法阶段命令返回原状态对象。这个不变量让双击、旧按钮事件和损坏的 UI 调用无法跳过游戏流程。

## 随机性

游戏使用内置 xorshift32 伪随机生成器。`GameState.rng` 是唯一随机游标：

- 每次抽取都同时返回结果与下一游标；
- 游标随存档持久化；
- reducer 内不调用 `Math.random()`；
- 相同种子与相同行动序列产生字节级相同状态。

这使随机代价既不可提前预知，又可以被测试和可靠恢复。

## 数据与规则分离

`content.ts` 保存正式故事的策划数据与生成小工具：14 个成长事件、15 个成年生活事件、卡牌变体、六种时代气候、五个章节、22 个世界意图和普通人出身字段。`identities.ts` 从实际人生牌册的五类记忆信号、成长倾向和资源派生三个起手身份；它不额外存一份会漂移的属性表。`prototype.ts` 单独保存固定成年原型的10张记忆牌、8张默认应对组、固定中性测试条件和按身份替换叙事的合同困局；原型不会抽取正式故事的随机时代气候，也不会覆盖正式18岁主流程。新增内容不需要修改 React。规则模块引用内容，但内容不引用规则。

`visuals.ts` 是剧情视觉注册表。14 个成长年龄、5 个正式章节、合同原型和15个成年事件都解析到明确的运行时 WebP 文件、替代文字与移动裁切焦点；缺失事件会直接抛错并由测试发现。每个三选一场景使用为左、中、右三个行动区专门构图的同一连续画面，`ChoiceArt` 按选择索引裁切对应区域。图片不承载规则文字，关键选择与成本始终由 HTML 呈现。

卡牌效果采用小型判别联合类型，而不是可执行脚本。这样内容无法注入任意行为，存档也能保持纯 JSON。

## 裁判接缝

`judge.ts` 内部有两个适配器：

- `LocalJudge`：立即返回 `null`，由规则模块生成本地叙述；
- `RemoteJudge`：向用户配置端点发送结构化上下文。

这是一个真实接缝，因为离线与远程两种行为都在产品中使用。适配器只影响 `PLAY_CARD.judgeText`，没有修改 `GameState` 数值的接口。远程调用带 5 秒中止、状态码检查、类型检查、字符清理和长度限制。

`scripts/judge-server.mjs` 是可选的本地中转参考实现。它从服务端环境变量读取模型密钥，限制来源、频率、请求大小和超时，再调用兼容 `/chat/completions` 的模型端点。浏览器永远不会接触密钥。

## 制作分析接缝

`prototypeAnalysis.ts` 对制作工具的唯一行为入口是 `analyzePrototype(identityId)`，并导出 `PrototypeDecisionReport`、`PrototypeOpeningOption`、`PrototypeOutcomeEnvelope` 三个返回结构类型。调用者提供一个起手身份，就会得到固定成年原型的开局选项、可达结果范围、最短胜利轮数以及童年余温/换手是否出现在可胜路线。实现内部生成候选 `GameAction`，以 `reduceGame` 是否改变状态作为唯一合法性裁判，不维护第二套得分、补牌或次数限制规则。

`scripts/analyze-prototype.ts` 只是命令行适配器，把三个身份的报告排成制作表格；它不参与游戏运行。工具源码与游戏规则一起接受TypeScript严格检查。

## 制作试玩记录接缝

`playtestRecord.ts` 只暴露 `formatPrototypePlaytestRecord(state)`。它接受已经结案的成人原型状态，生成包含包版本、待主持人填写的匿名编号、身份、固定种子、终局资源、换手/余温和逐轮事实的Markdown；正式故事、未结困局或无效身份返回 `null`。版本从 `package.json` 单一来源读取。模块不读取浏览器、不联网，也不接收姓名、联系方式或访谈答案。React只负责提供同内容的剪贴板与Markdown下载入口，并显示复制成功或权限失败反馈。

`npm run playtest` 先执行生产构建，再以Vite preview在固定4173端口监听本机与局域网地址。阶段1使用 `?playtest=adult-prototype` 查询参数进入专用试玩壳：它只读取当前构建的原型存档，正式故事存档既不会被读取也不会被自动保存覆盖；当前构建的成人原型进度可刷新恢复。专用壳隐藏正式“登记出生”入口，只允许选择三个固定身份。它只用于同一可信局域网内的现场试玩，不是预览部署或公网发布配置。

`playtestBatch.ts` 对制作工具暴露 `validatePlaytestBatch(markdownRecords)`，并导出输入、单份摘要与批次结果类型。命令行适配器传入证据目录中的Markdown；模块只用标题识别客观记录，其他观察笔记在分类后被忽略，不解析字段、不输出内容。它检查三份客观记录、构建版本、匿名编号、三个身份以及声明回合与逐轮事实是否一致，不推断选择理由或替代真人综合判断。`scripts/validate-playtest-batch.ts` 是本地文件系统适配器，`npm run validate:playtest -- <证据目录>` 以中文报告结果并在无效批次时返回非零退出码。该工具不被React导入，不改变冻结试玩构建。

## 存档策略

正式故事使用 `floating-life-cards.save.v5`，成人原型使用 `floating-life-cards.prototype.v5`。状态包含显式 `version: 5` 和 `mode: story | prototype`；原型槽额外用 `package.json` 构建版本封装，旧构建原型不会被新构建恢复或导出为新版本证据。加载时验证合法阶段、运行模式、核心资源、身份ID、八张随身牌、牌ID与牌堆唯一性、遭遇字段，以及身份/牌局/结案阶段不变量；解析失败或引用不合法直接视为无存档。v4正式故事会迁移到v5，成年阶段缺失的身份按旧档案重新生成；旧原型不迁移。游戏存档与可选裁判端点的任何存储异常都会被吞掉，当前会话保持可玩。

未来更改状态形状时应新增迁移函数或升级存档键，不能在旧字段上静默改变语义。

## UI 边界

`App.tsx` 按 phase 映射十一个阶段页面（含童年总结后的 `identity`）并负责会话编排；`screens/TitleScreen.tsx` 隔离正式/试玩入口，`screens/EncounterResultScreen.tsx` 隔离结案与客观记录导出，`components/AgeRail.tsx` 提供共享阶段标尺，`components/SceneArt.tsx` 统一剧情主图和选择裁切。其余阶段在继续扩展内容前逐步迁入 `screens/`。界面层可保留的临时状态只有：

- 裁判端点；
- 设置抽屉是否打开；
- 远程裁判请求中的卡牌 ID。
- 原型结案页的剪贴板成功或失败反馈。
- 首场渐进教学、对话框与移动菜单的打开/焦点状态。

任何会影响重载后游戏结果的状态都必须进入 `GameState`。页面切换后主动回到顶部，所有关键操作使用原生按钮，卡牌选择带 `aria-pressed`，状态反馈使用 `aria-live`，并尊重 `prefers-reduced-motion`。剧情视觉拥有唯一ID、桌面裁切、移动焦点、色调与四个选择焦点。390像素及以下采用上图下文、44像素触控目标和系统安全区；桌面保持画面与档案并置。

## 平台适配器

- `desktop/main.cjs` 只建立安全 `BrowserWindow`：启用 `contextIsolation` 与 `sandbox`、禁用 Node 注入、外部导航和新窗口；
- `scripts/package-windows.cjs` 用固定 Node 22 打包最小暂存目录，并在每次发布前清空整个旧运行时目录，避免开发依赖或陈旧文件进入 ASAR/安装包；`scripts/make-windows-installer.cjs` 只从干净且带版本标签的提交生成 Squirrel 安装器和发布清单；
- `capacitor.config.ts`、`android/`、`ios/` 只承载同一 `dist/`，不得复制游戏规则；
- `scripts/sync-native-version.cjs` 以 `package.json` 为版本唯一来源，同步 Android `versionName` 与 iOS `MARKETING_VERSION`；
- `assets/app-icon-source.png` 是三端图标源，生成结果进入 Windows ICO 与两端原生资源。

## 验证策略

- 单元测试通过规则接口验证确定性、14 年成长、身份生成、动态成年事件表、资源不透支与无选择锁死、换手限制、牌组限制、克制、分牌叙事、牌局记录和包含 10 个生活事件的完整结局路径；
- 1000个确定性完整人生验证三种身份都可达、章节有胜有负、资源始终在0–9且状态不会锁死；
- 存档测试覆盖双槽恢复与清除、构建版本隔离、损坏 JSON、非法阶段、缺失核心字段和遭遇阶段不变量；
- 入口组件测试覆盖标题到出生档案；
- 生产构建执行 TypeScript 严格检查；
- Playwright自动覆盖成人原型的桌面完整闭环、带版本匿名记录的复制与下载、390像素触摸环境中的图片解码/44像素目标/余温到结案下载、纯键盘首轮、390像素正式故事从出生走完童年并完成身份跳切，以及844×390窄屏横屏；
- 独立桌面 Playwright 配置真实启动打包后的 Windows EXE，不用浏览器预览冒充桌面包；
- 成人原型决策分析通过正式reducer穷举合法行动，检查身份与固定开局的数值死路；
- 真实 Chromium 人工验收覆盖标题、出身、成长、成年组牌、世界牌局和结案，并检查错误覆盖层、控制台、交互快照和移动视口；
- `npm run verify` 是本地统一质量门；GitHub Actions使用同一命令，远端失败证据保留为Playwright报告。
