# 三端共享架构

## 模块与接缝

```text
game/content + game/game + GameState
                │
                ▼
         React screens / visual registry
          │          │           │
          ▼          ▼           ▼
       Browser    Electron     Capacitor
                    │          │       │
                 Windows      iOS   Android
```

- 规则深模块：`src/game/game.ts`，三端只能派发 `GameAction` 和查询公开结果；
- 内容模块：事件、身份、困局与视觉 ID；
- 表现模块：React屏幕、响应式视觉和触摸/键盘输入；
- 桌面适配器：`desktop/main.cjs`，只负责安全窗口和本地文件加载；
- 移动适配器：`capacitor.config.ts`、`ios/`、`android/`，只负责原生容器；
- 发布适配器：Windows 打包脚本使用 npm 脚本 PATH 中的 Node；开发与打包统一遵循 `package.json` 的版本范围（22.22.2–22.x、24.15.0–24.x 或 ≥26.0.0）。

Electron 和 Capacitor 是两个真实适配器，因此平台差异应收敛在壳层。任何“如果是 iOS 就改变牌力”的代码都属于架构违规。

## 命令

```powershell
npm run desktop:run       # 构建并启动桌面开发包
npm run desktop:package   # 生成Windows可执行目录
npm run desktop:make      # 生成Windows安装包
npm run test:desktop      # 真实启动exe的Playwright检查
npm run mobile:sync       # 同步dist到iOS和Android工程
npm run verify:release    # Web、桌面和移动同步统一质量门
```

## 当前环境边界

本机有Node与Electron构建能力，已生成iOS和Android工程；没有JDK/Android SDK，也不是macOS，因此移动端只执行Web构建与Capacitor同步。移动签名包必须在对应官方工具链中生成和真机验证。
