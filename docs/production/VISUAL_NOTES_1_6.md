# v1.6「旧事回响」视觉延续记录

本记录针对现有游戏的普通扩展，以完成后的组件、CSS 和截图为依据。沿用[剧情视觉系统](../v3/VISUAL_SYSTEM.md)的“纸面留下的场景余影”，把童年记忆放回当下决定和结卷档案中。本轮没有建立新视觉身份、生成新图像或新增全局色彩令牌。

## 已核对的延续

- **纸与墨色**：`src/styles.css` 继续使用档案蓝 `#dce3f7`、纸白 `#f7f8fc`、墨蓝 `#17213b`；蓝色 `#285b8f` 标示年龄与回响，绿色 `#28634f` 表示休整收益。新增组件直接引用已有变量。
- **文字层级**：标题和记忆引文延续 `STSong / SimSun / serif`，正文沿用 `Microsoft YaHei / PingFang SC / sans-serif`。回响引文为 `1.05rem`，解释为 `0.86rem / 1.8`；结卷故事标题为 `clamp(1.5rem, 3.2vw, 2rem)`。这些是当前局部实现值，不是另立字体规范。
- **旧物回到新现场**：10岁成长延续通过 `artAge: 9` 复用收音机场景；23岁维修回响显式指向同一张 `growth-09-v1.webp`。同桌成年回响复用 `adult-relationship-crossroad-v1.webp`。`visuals.ts` 保留明确映射，图片不承载选择、成本或记忆文字。
- **场景退后，决定在前**：既有场景层保持灰度、低透明度与右侧构图，年龄栏继续定位人生阶段。完成后的 CSS 为桌面图像 `opacity: 0.14`、手机 `0.12`；新旁注不添加独立海报或大块背景。

## 局部组件与响应式

| 完成项 | 桌面实现 | 620px及以下 |
| --- | --- | --- |
| 记忆旁注 `MemoryEchoPanel` | 位于问题与选择之间；来源年龄和正文两列，`88px / 1fr`、间距24px、最大宽800px，上下细线；引用实际持有的记忆，无来源时不渲染 | 年龄列54px、间距16px，年龄字从2.8rem缩为2.35rem；保持来源先于正文 |
| 启程休整 | 身份原因之后、进入成年按钮之前；说明与数值两列，最大宽820px；明确显示当前心气到3点、实际恢复量和“仅此一次” | 单列；数值同行排列，执行时点另起一行；沿用同一进入成年按钮 |
| 手牌记忆 `CardFace` | 紧凑牌也保留年龄、记忆正文、效果与牌力/守势；手牌紧凑卡最小高280px，记忆为0.82rem、行高1.75 | 沿用现有单列手牌，保留完整记忆正文；页面因此更长 |
| 结卷故事 `LifeThreads` | 位于尾声与统计之间；每条故事用有序列表呈现起因、童年延续、成年回应，列比 `1 / 1 / 1.5`，间距30px、整体最大宽1040px | 顺序堆叠，间距22px，左侧细线与16px内距形成阅读路径 |

回响使用带说明的 `aside`，结卷使用有标题的 `section` 与有序列表；选择仍是原生按钮。`story.ts` 从已保存的选择和记忆派生故事，尚未发生的成年回应显示“尚未展开”。旧故事返回空故事链，不补写旧档中无法还原的成年经历。打印样式保留三列且避免单条故事拆页；本次截图未验证打印输出。

## 已查看的成品证据

全部十张截图均已打开核对，对应1440×900桌面视口和390×844触摸手机视口的整页捕获；文件高度随内容增长。

| 场景 | 桌面 | 手机 | 截图可证明的内容 |
| --- | --- | --- | --- |
| 10岁成长延续 | [childhood-desktop](../../.impeccable/review/childhood-desktop.png) | [childhood-mobile](../../.impeccable/review/childhood-mobile.png) | 9岁来源记忆、同一修理铺图像、三种当下选择 |
| 成年启程 | [departure-desktop](../../.impeccable/review/departure-desktop.png) | [departure-mobile](../../.impeccable/review/departure-mobile.png) | 心气 `1 → 3`、恢复2点和一次性说明与进入动作相邻 |
| 23岁回响 | [echo-desktop](../../.impeccable/review/echo-desktop.png) | [echo-mobile](../../.impeccable/review/echo-mobile.png) | 10岁记忆、四种回应及具体成本；特殊回应标明来自过去选择 |
| 成年手牌 | [cards-desktop](../../.impeccable/review/cards-desktop.png) | [cards-mobile](../../.impeccable/review/cards-mobile.png) | 记忆与规则同时可读；桌面双列手牌转为手机单列 |
| 结卷档案 | [ending-desktop](../../.impeccable/review/ending-desktop.png) | [ending-mobile](../../.impeccable/review/ending-mobile.png) | 9→10→23岁和8→12→27岁两条实际故事，手机保持各故事的年代顺序 |

[完成评审记录](../../.impeccable/review/finish-review.md)最初只要求修正旁注解释文字的对比度。修正将其改为已有墨色，评审复核其在原测量背景 `#d4d5d8` 上约为10.86:1，并给出 `ship`。该最终结论只覆盖这一条修正的评分；不扩展为新一轮全界面审核。

主制作交接报告：179项单元测试、14项浏览器旅程、内容校验及生产构建通过，原有3条静态检查警告未变；Windows 1.6桌面包和真实EXE烟测通过。本记录没有重跑这些检查。Android/iOS已同步资产，尚未完成原生构建与真机视觉验收。静态截图也不能证明键盘、动效、错误状态或所有存档路径。

## 继承的缺口与边界

- 项目原本没有根级 `PRODUCT.md`、`DESIGN.md` 和 `.impeccable/design.json`。本轮依据已有视觉文档、制作记录和实现核对延续性，只写此局部记录，不补建全局规范。
- 旧视觉文档写图像约9–13%透明度，当前桌面实现为14%；架构文档仍保留选择项裁图的旧描述，而当前成长及成年选择为纯文字。这里记录差异，不改写其他文档，也不把数值差异升级为新全局规则。
- 既有结卷眉题/副标、系统宋体显示字及按钮/档案开关的硬偏移投影被保留；它们不因本次文档收尾而成为新增组件必须继承的规范。此记录没有开展或宣称完成整套视觉系统重构。

核对源包括 `src/App.tsx` 的阶段挂载、`MemoryEchoPanel.tsx`、`LifeThreads.tsx`、`CardFace.tsx`，成长/成年事件/身份/结卷四个屏幕，以及 `styles.css`、`story.ts`、`visuals.ts`；内容语义与[本轮制作决策](./ITERATION_1_6.md)、`CONTEXT.md`及现有游戏设计说明交叉核对。
