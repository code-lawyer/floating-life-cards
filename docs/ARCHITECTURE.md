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
getNextChapter(state): Chapter | null
getChapterRecovery(state): Pick<Resources, 'heart' | 'pressure'>
canConfirmInterlude(state): boolean
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
  adult-result --> interlude: CONTINUE_ADULT_EVENT / echoes, next chapter
  interlude --> interlude: TOGGLE_DECK / RESTORE_DECK
  interlude --> encounter: CONFIRM_INTERLUDE / exactly 8 cards
  adult-result --> encounter: CONTINUE_ADULT_EVENT / classic, next chapter
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

`RESTART` 动作必须携带新种子。重开按钮和结局页共用 `App` 中的入口生成种子，规则模块只消费动作数据；返回原型身份入口时可显式保留原种子。因此含重开的行动序列也可确定性回放。

这使随机代价既不可提前预知，又可以被测试和可靠恢复。

## 数据与规则分离

`content.ts` 保存正式故事的策划数据与生成小工具：14 个成长事件、15 个成年生活事件、卡牌变体、六种时代气候、五个章节、22 个世界意图和普通人出身字段。`identities.ts` 从实际人生牌册的五类记忆信号、成长倾向和资源派生三个起手身份；它不额外存一份会漂移的属性表。`prototype.ts` 单独保存固定成年原型的10张记忆牌、8张默认应对组、固定中性测试条件和按身份替换叙事的合同困局；原型不会抽取正式故事的随机时代气候，也不会覆盖正式18岁主流程。新增内容不需要修改 React。规则模块引用内容，但内容不引用规则。

`visuals.ts` 是剧情视觉注册表。14 个成长年龄、5 个正式章节、合同原型和15个成年事件都解析到明确的运行时 WebP 文件、替代文字与移动裁切焦点；缺失事件会直接抛错并由测试发现。每个三选一场景使用为左、中、右三个行动区专门构图的同一连续画面，`ChoiceArt` 按选择索引裁切对应区域。图片不承载规则文字，关键选择与成本始终由 HTML 呈现。

卡牌效果采用小型判别联合类型，而不是可执行脚本：`resource` 分支必须同时提供资源名与数值，`draw/echo/steady` 分支只需效果说明。类型回归随生产构建接受编译检查，内容与存档仍保留运行时校验。这样内容无法注入任意行为，存档也能保持纯 JSON。

随身牌容量由 `src/game/constants.ts` 的 `DECK_SIZE` 定义，自动组牌、手动增减、阶段确认、界面说明、内容与存档校验都引用这一约束。

## 选择事实与旧事回响

`story.ts` 保存两个条件成长事件、两个成年回响事件及其派生方法。`storyChoices` 以 `growth:<年龄>` 和 `adult:<事件ID>` 记录玩家确实做过的选择。成长解析器优先匹配已发生的选择，再回到对应年龄的基础内容；成年排程先使用原随机池，再将符合条件的一次回响替换到同章，保持每章两次、共十次事件和确定性随机游标。

记忆门槛与资源成本同时由规则层检查。`upgradeMemoryAge` 只淬炼那一年实际获得的记忆，无论是否带在当前八张牌里。界面旁注、个人尾声和结局时间线从真实牌册、使用次数及选择事实派生，不另存一份叙事副本，也不把未发生的结果写成已经发生。

个人尾声优先收束已经做出决定的旧事回响；没有这类回响时，从 `adultEventsResolved` 倒序找到有明确选择事实的最近事件，引用事件名与实际选择，包括资源不足时的被动决定。不从未来排程推断决定，也不补写旧版本缺少的事实。

`storyEdition` 区分 `classic` 与 `echoes`。仅新故事应用条件内容和首次启程最低3点心气休整；旧存档继续原叙事与排程。新场景通过 `visuals.ts` 显式映射到旧物画面，作为视觉回声。

## 章节间重新上路

回响故事在一章局面和两次生活事件都结束后进入 `interlude`；心气耗尽与最终结卷优先，不额外插入整理页。`deckDraft` 是可持久化的独立草稿，进入时复制 `selectedDeck`，允许暂时不足八张；编辑与恢复草稿不改变已结算牌局、资源、熟练或随机游标。

`CONFIRM_INTERLUDE` 在规则边界验证八张唯一且已拥有的牌，提交牌组，按 `getChapterRecovery` 显示的实际数值休整，再进入下一场并洗牌。它只执行一次；旧阶段重复调用返回原对象。`deckRevisions` 按章节记录前后牌组，包括保留原牌组的决定；结局标题从真实牌册派生。校验器检查草稿与阶段对应、记录连续性、牌所有权，以及最近记录与当前章节/牌组的一致性。旧档案没有发生过的整理不会补造。

## 裁判接缝

`judge.ts` 内部有两个适配器：

- `LocalJudge`：立即返回 `null`，由规则模块生成本地叙述；
- `RemoteJudge`：向用户配置端点发送结构化上下文。

这是一个真实接缝，因为离线与远程两种行为都在产品中使用。适配器只影响 `PLAY_CARD.judgeText`，没有修改 `GameState` 数值的接口。远程调用带 5 秒中止、状态码检查、类型检查、字符清理和长度限制。`EncounterScreen` 为每次请求绑定牌局上下文，在上下文变化或页面卸载时取消；提交前再次检查请求是否仍属于当前牌局，阻止迟到的响应替重开后的新局出牌。超时或网络失败仍回退到本地叙述。

`scripts/judge-server.mjs` 是可选的本地中转参考实现。它从服务端环境变量读取模型密钥，限制来源、频率、请求大小和超时，再调用兼容 `/chat/completions` 的模型端点。20秒上游超时覆盖响应头和正文读取，成功、HTTP失败、JSON解析失败或中止时统一释放计时器。浏览器永远不会接触密钥。

## 制作分析接缝

`prototypeAnalysis.ts` 对制作工具的唯一行为入口是 `analyzePrototype(identityId)`，并导出 `PrototypeDecisionReport`、`PrototypeOpeningOption`、`PrototypeOutcomeEnvelope` 三个返回结构类型。调用者提供一个起手身份，就会得到固定成年原型的开局选项、可达结果范围、最短胜利轮数以及童年余温/换手是否出现在可胜路线。实现内部生成候选 `GameAction`，以 `reduceGame` 是否改变状态作为唯一合法性裁判，不维护第二套得分、补牌或次数限制规则。

`scripts/analyze-prototype.ts` 只是命令行适配器，把三个身份的报告排成制作表格；它不参与游戏运行。工具源码与游戏规则一起接受TypeScript严格检查。

`storySimulation.ts` 的 `simulateStory(seed, options)` 通过同一个 `reduceGame` 跑完整人生，支持混合、保守与轮换策略、明确的故事选择和检查点回调。`repack: keep | rotate` 可比较原八张与每章轮换一张，草稿的中间状态也进入检查点。恢复方案仅用于制作对照，不成为产品设置。`npm run analyze:story -- 1000` 比较八组情景的成年开局、提前结卷、五章完成及回响抵达情况，并验证所有最终状态；它不模拟真人的理解、情感或乐趣。

## 制作试玩记录接缝

`playtestRecord.ts` 只暴露 `formatPrototypePlaytestRecord(state)`。它接受已经结案的成人原型状态，生成包含包版本、待主持人填写的匿名编号、身份、固定种子、终局资源、换手/余温和逐轮事实的Markdown；正式故事、未结困局或无效身份返回 `null`。版本从 `package.json` 单一来源读取。模块不读取浏览器、不联网，也不接收姓名、联系方式或访谈答案。React只负责提供同内容的剪贴板与Markdown下载入口，并显示复制成功或权限失败反馈。

`npm run playtest` 先执行生产构建，再以Vite preview在固定4173端口监听本机与局域网地址。阶段1使用 `?playtest=adult-prototype` 查询参数进入专用试玩壳：它只读取当前构建的原型存档，正式故事存档既不会被读取也不会被自动保存覆盖；当前构建的成人原型进度可刷新恢复。专用壳隐藏正式“登记出生”入口，只允许选择三个固定身份。它只用于同一可信局域网内的现场试玩，不是预览部署或公网发布配置。

`playtestBatch.ts` 对制作工具暴露 `validatePlaytestBatch(markdownRecords)`，并导出输入、单份摘要与批次结果类型。命令行适配器传入证据目录中的Markdown；模块只用标题识别客观记录，其他观察笔记在分类后被忽略，不解析字段、不输出内容。它检查三份客观记录、构建版本、匿名编号、三个身份以及声明回合与逐轮事实是否一致，不推断选择理由或替代真人综合判断。`scripts/validate-playtest-batch.ts` 是本地文件系统适配器，`npm run validate:playtest -- <证据目录>` 以中文报告结果并在无效批次时返回非零退出码。该工具不被React导入，不改变冻结试玩构建。

## 存档策略

正式故事使用 `floating-life-cards.save.v7`，成人原型使用 `floating-life-cards.prototype.v7`。状态包含显式 `version: 7`、`mode: story | prototype`、`storyEdition`、`storyChoices`、`deckDraft` 和 `deckRevisions`；原型槽额外用包版本封装，旧构建原型不会作为新构建证据。`persistence.ts` 负责槽位与存储异常，`saveValidation.ts` 检查外部 JSON 的嵌套结构、范围、引用、牌堆守恒及阶段一致性，并验证选择事实、整理记录与实际记忆、条件排程和已完成事件的关联。v6原位迁移，保留故事版本与选择事实，只初始化空整理记录；回响故事在未来的章节转换进入整理页。v4/v5正式故事迁移为classic；成长选择从实际牌ID恢复，旧成年决定无法可靠推断时不伪造。v4缺失的成年身份按旧档案补齐，旧原型不迁移。无效存档被拒绝，存储异常不会中断当前游戏。

迁移得到的有效状态先交给当前会话使用；回写v7槽位只是可失败的持久化步骤。存储配额或写入权限不足时仍恢复可读的v4/v5/v6进度，并保留旧槽位。未来更改状态形状时应新增迁移函数或升级存档键，不能在旧字段上静默改变语义。

已记录的成年选择还必须满足自身的 `memoryRequirement`，使用与规则层相同的 `remembersChoice` 查询；当前成年结果的选择文案必须与该事实一致。v4/v5没有记录成年选择时不强制补齐，避免拒绝合法旧档。v1.7.1未改变v7结构；已经保存的结局正文保持原样，新生成的结局应用普通路线尾声补全。

v1.7.2进一步验证成年时间序：排程按章节、年龄非降序，完成列表必须是排程前缀；当前事件必须是下一项，完成数必须匹配已抵达章节及当前阶段。心气耗尽允许在牌局后或本章任一事件后提前结卷，同龄事件可以并列。每章事件数由 `ADULT_EVENTS_PER_CHAPTER` 在排程、内容和存档校验间共享。

叙事设置的连接测试拥有独立取消控制器；修改端点、关闭设置或卸载时取消，响应写回前还要核对请求归属，避免旧响应误报新端点可用。

## UI 边界

`App.tsx` 只做会话编排：装载存档、维护裁判端点、按 phase 映射十二个阶段页面（含童年总结后的 `identity` 与章节间的 `interlude`），本身不含任何阶段界面。每个阶段页面都是 `screens/` 下的独立模块，共享部件在 `components/`：`AgeRail` 阶段标尺、`SceneArt` 把剧情画面统一处理为低对比去色背景、`ApproachMark`／`CardFace`／`LifeMarkTag` 三个牌面与状态原子、`DialogShell` 承担全部模态的焦点闭环与滚动锁、`AppHeader`／`GameGuide`／`Journal` 承担常驻外壳。牌局页进一步把三步教学拆到 `components/DuelCoach.tsx`、把单张可出手牌拆到 `components/HandOption.tsx`，使 `EncounterScreen` 只保留局面编排。表现层常量（资源名与符号、三种做法的样式类与说明）集中在 `game/presentation.ts`，不在组件里重复声明。选项保持纯文字，不再重复裁切同一张缩略图。界面层可保留的临时状态只有：

- 裁判端点；
- 设置抽屉是否打开；
- 远程裁判请求中的卡牌 ID。
- 原型结案页的剪贴板成功或失败反馈。
- 首场渐进教学、对话框与移动菜单的打开/焦点状态。
- 整理页的做法筛选与操作反馈；牌组草稿必须存入规则状态。

任何会影响重载后游戏结果的状态都必须进入 `GameState`。页面切换后主动回到顶部，所有关键操作使用原生按钮，卡牌选择带 `aria-pressed`，状态反馈使用 `aria-live`，并尊重 `prefers-reduced-motion`。剧情视觉拥有唯一ID、桌面裁切、移动焦点、色调与四个选择焦点。390像素及以下采用上图下文、44像素触控目标和系统安全区；桌面保持画面与档案并置。

## 平台适配器

- `desktop/main.cjs` 在创建窗口前处理 Squirrel 安装、升级、卸载与旧版本退场事件：通过 `Update.exe` 创建或删除快捷方式后退出，助手失败或超时也不会打开游戏。正常启动才建立安全 `BrowserWindow`：启用 `contextIsolation` 与 `sandbox`、禁用 Node 注入、外部导航和新窗口；
- `scripts/package-windows.cjs` 使用 npm 脚本 PATH 中的 Node 打包最小暂存目录，并在每次发布前清空整个旧运行时目录，避免开发依赖或陈旧文件进入 ASAR/安装包；`scripts/make-windows-installer.cjs` 只从干净且带版本标签的提交生成 Squirrel 安装器和发布清单。Vite 文件监听排除桌面暂存、运行时和安装器输出，避免 Windows DLL 文件锁导致开发服务退出；
- `capacitor.config.ts`、`android/`、`ios/` 只承载同一 `dist/`，不得复制游戏规则；
- `scripts/sync-native-version.cjs` 以 `package.json` 为版本唯一来源，同步 Android `versionName` 与 iOS `MARKETING_VERSION`；
- `assets/app-icon-source.png` 是三端图标源，生成结果进入 Windows ICO 与两端原生资源。

## 验证策略

- 单元测试通过规则接口验证确定性、14 年成长、身份生成、动态成年事件表、资源不透支与无选择锁死、换手限制、牌组限制、克制、分牌叙事、牌局记录和包含 10 个生活事件的完整结局路径；
- 1000个确定性完整人生验证三种身份都可达、章节有胜有负、资源始终在0–9且状态不会锁死，流程中的正常状态也必须通过存档校验；新故事另以300种子要求混合策略走完五章不少于75%，作为数值退化护栏；
- `contentValidation.ts` 校验内容自洽性：章节轮次是否配齐世界意图、基础成年事件池每章是否至少有两项（条件回响不能补足容量）、童年选择的卡牌与代价是否非空、卡牌resource效果字段是否完整、`removeMark` 与原型牌组引用是否存在、身份被动能否被内容触发，以及每张记忆牌的标签能否进入成长画像；所有基础与回响事件仍接受字段检查，未桥接的单个标签作为不阻塞提醒列出；
- 存档测试用真实 reducer 生成覆盖全部十二个阶段的完整故事，再逐项注入损坏字段；每个负例均先证明正常对照可以恢复。另覆盖不满八张的整理草稿、整理历史连续性、原型逐轮恢复、双槽隔离、构建版本隔离、损坏 JSON 和真正的 v4/v6 迁移，避免错用旧键造成负例提前被版本检查挡住；
- 入口组件测试覆盖标题到出生档案、损坏嵌套存档的可用回退，以及重开后迟到的远程响应不会污染新局；裁判测试验证外部取消与五秒超时都会释放计时器；
- 生产构建执行 TypeScript 严格检查；
- Playwright自动覆盖成人原型的桌面完整闭环、带版本匿名记录的复制与下载、390像素触摸环境中的图片解码/44像素目标/余温到结案下载、纯键盘首轮、390像素正式故事从出生走完童年并完成身份跳切，以及844×390窄屏横屏；
- 正式故事覆盖出生到五章结局、牌局中途刷新后逐项恢复章节/轮次/推进/结果/手牌，以及固定种子在桌面与触摸手机上的两条回响完整旅程。新旅程检查来源记忆、条件回应、成年结果刷新、结局事实、全程横向溢出、手机选项正文宽度与档案入口不遮挡内容；缺少对应童年做法的回应另有禁用回归；
- 整理行囊覆盖桌面、390像素触摸竖屏和844×390横屏：换牌草稿刷新、恢复旧组、再次带回记忆、四次整理到结局、导航锚点避开页头及v6原位迁移；
- 独立桌面 Playwright 配置真实启动打包后的 Windows EXE，不用浏览器预览冒充桌面包；安装生命周期单元测试验证四种 Squirrel 事件、助手失败/超时退出与正常首次启动；
- 成人原型决策分析通过正式reducer穷举合法行动，检查身份与固定开局的数值死路；
- 真实 Chromium 人工验收覆盖标题、出身、成长、成年组牌、世界牌局和结案，并检查错误覆盖层、控制台、交互快照和移动视口；
- `npm run verify` 是本地统一质量门；GitHub Actions使用同一命令，远端失败证据保留为Playwright报告。
