# 技术设计

## 技术基线

- React + TypeScript + Vite；
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
canBeginAdventure(state): boolean
canChooseAdultChoice(state, choice): boolean
approachRelation(card, intent): Relation
getWorldPower(state): number | null
getRedrawPressureCost(state): number
previewCardPlay(state, card): CombatPreview | null
```

成长抽取、成本、资源夹取、组牌、洗牌、补牌、克制、效果、章节推进与结局选择都隐藏在这一个接口后。React 只渲染状态并派发玩家命令，不重新实现规则。手牌上的预计得分调用 `previewCardPlay`，真实出牌结算也调用同一函数，避免说明与规则漂移。测试与界面跨越的是同一条接缝。

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
  deck --> encounter: BEGIN_ADVENTURE / exactly 8 cards
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

`content.ts` 保存正式故事的策划数据与生成小工具：14 个成长事件、15 个成年生活事件、卡牌变体、六种时代气候、五个章节、22 个世界意图和普通人出身字段。`prototype.ts` 单独保存固定成年原型的10张记忆牌、8张默认应对组和按身份替换叙事的合同困局；原型不会覆盖正式18岁主流程。新增内容不需要修改 React。规则模块引用内容，但内容不引用规则。

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

`playtestRecord.ts` 只暴露 `formatPrototypePlaytestRecord(state)`。它接受已经结案的成人原型状态，生成包含包版本、身份、固定种子、终局资源、换手/余温和逐轮事实的Markdown；正式故事、未结困局或无效身份返回 `null`。版本从 `package.json` 单一来源读取。模块不读取浏览器、不联网，也不接收姓名、联系方式或访谈答案。React只负责提供同内容的剪贴板与Markdown下载入口，并显示复制成功或权限失败反馈。

`npm run playtest` 先执行生产构建，再以Vite preview在固定4173端口监听本机与局域网地址。它只用于同一可信局域网内的现场试玩，不是预览部署或公网发布配置。

## 存档策略

存档键为 `floating-life-cards.save.v4`，状态包含显式 `version: 4` 和 `mode: story | prototype`。v4保留回忆堆、童年余温与起手身份引用，并能安全恢复固定成年原型；加载时验证版本、运行模式、身份ID、牌ID引用及困局字段，解析失败或引用不合法直接视为无存档。任何存储异常都会被吞掉，游戏保持可玩。

未来更改状态形状时应新增迁移函数或升级存档键，不能在旧字段上静默改变语义。

## UI 边界

`App.tsx` 按 phase 映射八个阶段页面。界面层可保留的临时状态只有：

- 裁判端点；
- 设置抽屉是否打开；
- 远程裁判请求中的卡牌 ID。
- 原型结案页的剪贴板成功或失败反馈。

任何会影响重载后游戏结果的状态都必须进入 `GameState`。页面切换后主动回到顶部，所有关键操作使用原生按钮，卡牌选择带 `aria-pressed`，状态反馈使用 `aria-live`，并尊重 `prefers-reduced-motion`。

## 验证策略

- 单元测试通过规则接口验证确定性、14 年成长、动态成年事件表、换手限制、牌组限制、克制、牌局记录和包含 10 个生活事件的完整结局路径；
- 存档测试覆盖成功恢复、清除、损坏 JSON 与版本不符；
- 入口组件测试覆盖标题到出生档案；
- 生产构建执行 TypeScript 严格检查；
- Playwright自动覆盖成人原型的桌面完整闭环、带版本匿名记录的复制与下载、390像素余温到结案下载和纯键盘首轮，并捕获页面与控制台错误；
- 成人原型决策分析通过正式reducer穷举合法行动，检查身份与固定开局的数值死路；
- 真实 Chromium 人工验收覆盖标题、出身、成长、成年组牌、世界牌局和结案，并检查错误覆盖层、控制台、交互快照和移动视口；
- `npm run verify` 是本地统一质量门；GitHub Actions使用同一命令，远端失败证据保留为Playwright报告。
