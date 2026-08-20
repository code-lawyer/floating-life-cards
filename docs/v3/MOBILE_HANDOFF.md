# iOS / Android 真机交接

## 已同步

- `capacitor.config.ts`：`com.fusheng.cards` / `浮生牌局` / 共享`dist/`；
- Android `versionName` 与 iOS `MARKETING_VERSION` 均从`package.json`同步为1.5.0；
- 两端已写入同一Web构建、40张WebP剧情图、应用图标与启动图；
- 390×844 Chromium触摸旅程验证场景图实际解码、44像素主要操作、身份跳切、童年余温、下载与无横向溢出；844×390触摸旅程验证窄屏横屏构图。

## Android门

1. 安装JDK 21与当前Android Studio/SDK，执行`npm ci && npm run mobile:sync`；
2. 用Android Studio构建debug包，先验证无原生编译错误；
3. 配置独立release keystore，构建AAB，不把密钥提交仓库；
4. 至少一台低端与一台主流真机测试：首次启动、竖/横屏、系统返回、暂停恢复、离线启动、图片解码、系统字体、存档升级；
5. 完成Play Console内部测试、数据安全表、年龄分级、截图与审核说明。

## iOS门

1. 在macOS安装当前Xcode，执行`npm ci && npm run mobile:sync`；
2. 用Apple Developer团队设置Bundle签名并先完成模拟器编译；
3. 至少一台小屏iPhone和一台刘海/灵动岛机型测试：安全区、竖/横屏、后台恢复、离线启动、图片解码、系统字体、存档升级；
4. Archive并上传TestFlight，完成隐私清单、年龄分级、截图、支持与隐私URL；
5. TestFlight通过后再提交App Store审核。

浏览器移动视口只能提前发现布局问题，不能替代上述原生编译、签名、生命周期和真机性能门。
