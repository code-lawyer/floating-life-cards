# 剧情视觉系统：档案里的电影静帧

## 视觉命题

文字仍然负责选择和因果，图片负责让玩家先感到“这件事发生在一个具体地方”。画面不是卡牌稀有度插画，而是人生档案里偶然留下的一帧：旧书桌、站点办公室、候诊走廊、夜班公交、搬家纸箱和平台服务中心。

## 视觉语言

- 主色：档案紫蓝 `#DCE3F7`、墨蓝 `#17213B`、钴蓝 `#285B8F`、克制的暗红 `#AA3F4A`、纸白 `#F7F8FC`；
- 图像：现实主义构图叠加水粉与孔版印刷颗粒，保留纸纤维和轻微套色偏差；
- 人物：优先使用手、背影、生活痕迹与空间，避免固定主角脸影响玩家代入；
- 光线：普通城市真实光源，不用奇幻光、励志广告逆光或奢侈室内；
- 文字不烧进图片，所有标题与数值由界面渲染。

## 布局

桌面：

```text
┌─────────────── 画面 44% ───────────────┬──── 档案/选择 56% ────┐
│ 事件空间、时代与人物痕迹                 │ 年龄、标题、问题         │
│ 可被轻遮罩，不承载关键文字               │ 三个选择及真实成本       │
└────────────────────────────────────────┴──────────────────────┘
```

手机竖屏：

```text
┌──────── 32–40svh 剧情画面 ────────┐
│ 焦点位由 visual.mobilePosition 声明│
├───────────────────────────────────┤
│ 标题 / 问题                         │
│ 选择图 + 选择文案 + 成本             │
│ 固定底部主要动作，尊重安全区          │
└───────────────────────────────────┘
```

## 内容契约

每个视觉引用最终必须包含：

```ts
interface SceneVisual {
  id: string;
  src: string;
  alt: string;
  desktopPosition: string;
  mobilePosition: string;
  tone: 'childhood' | 'threshold' | 'adult' | 'aftermath';
  choiceFocalPoints: readonly [string, string, string, string];
}
```

成长事件、成年事件、困局与困局结案由 `visuals.ts` 解析稳定且唯一的视觉ID；常规三选一图片按左、中、右行动区裁切，资源全锁时的第四项使用独立的下方焦点，不会退回模糊的中心默认值。后续内容工具化时再把当前年龄/事件白名单迁成内容侧 `sceneVisualId`，不在当前发布候选里制造第二套注册表。

## 动效

唯一标志性动效是“记忆显影”：新场景第一次出现时，画面从低对比纸纹在 320ms 内显影，随后完全静止。出牌只让所选记忆的局部边框与结果文字建立联系，不做持续漂浮、粒子和卡牌翻转。`prefers-reduced-motion` 下直接显示最终帧。

## 首批资产

- `public/art/title-key-art-v1.webp`：标题主视觉与全项目风格锚点；
- `public/art/growth-04-v1.webp` 至 `growth-17-v1.webp`：14个童年场景；
- `public/art/chapter-*.webp`、`contract-key-art-v1.webp`：正式世界牌局与合同原型；
- `public/art/adult-*.webp`：15个成年生活事件；
- `deck-key-art-v1.webp`、`ending-key-art-v1.webp`：阶段跳切与结卷；
- 高分辨率PNG保留在生成源目录，运行时40张WebP合计约5.7MB；
- 每次生成记录最终提示词、模型路径、日期和人工验收结论。

## 首批生成记录

- 模式：OpenAI内置 `imagegen`；
- 日期：2026-08-19；
- 基础提示词：`Create a 16:9 cinematic editorial illustration for Chinese narrative card game 《浮生牌局》. Grounded documentary realism blended with restrained gouache and subtle risograph grain; indigo, periwinkle, warm paper, muted oxblood; ordinary contemporary Chinese life; no identifiable faces, no readable text/logos/watermark/fantasy/anime. Compose one continuous scene with three readable action zones left-to-right, each safe to crop as mobile choice thumbnail, central narrative object clear, preserve vertical crop room.`；
- 每张再追加对应年龄、事件、地点和三种行动细节；
- 应用图标提示词强调折叠人生卡、长成嫩芽的蓝色路线、暗红印章与小尺寸识别度；
- 原始生成稿：`C:\Users\lanzh\.codex\generated_images\01a0177d-c587-72f1-9397-8f8ce83a72cf`；
- 发布资产：`public/art/`、`assets/app-icon-source.png`、`assets/app-icon.ico`及两端原生资源目录。
