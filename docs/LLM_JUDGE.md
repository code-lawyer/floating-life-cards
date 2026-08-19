# LLM 叙事裁判接入指南

LLM 裁判完全可选。它只为玩家出牌后写一段专属叙述，不接触或决定牌力、胜负、资源、抽牌和随机数。网络失败时游戏会自动使用内置文案。

## 最快的本地接入方式

项目提供了一个不依赖第三方 npm 包的中转服务。它兼容提供 `/chat/completions` 接口的模型服务。

在 PowerShell 中打开第二个终端：

```powershell
$env:LLM_API_KEY="你的模型密钥"
$env:LLM_MODEL="你的模型名称"
$env:LLM_BASE_URL="https://你的模型服务/v1"
npm run judge
```

如果使用的服务基地址就是 `https://api.openai.com/v1`，可以省略 `LLM_BASE_URL`。模型名称必须由你明确填写，项目不会替你猜测账号可用的模型。

看到以下提示即表示中转已启动：

```text
Floating Life judge listening at http://127.0.0.1:8787/judge
```

然后：

1. 保持中转终端运行；
2. 在游戏顶部打开“设置”，展开“开发者接入：连接 LLM 叙事裁判”；
3. 填入 `http://localhost:8787/judge`；
4. 点击“测试端点”；
5. 显示“连接成功”后即可继续游戏。

## 为什么需要中转服务

浏览器中的代码、网络请求和本地存储都可以被玩家查看。如果把模型密钥直接放进游戏页面，密钥就等于公开。中转服务把密钥保存在进程环境变量里，浏览器只知道一个 `/judge` 地址。

本地示例还包含：

- 只允许配置过的浏览器来源；
- 每个地址每分钟最多 30 次请求；
- 32 KB 请求体上限；
- 上游请求 20 秒超时；
- 不记录玩家故事内容或模型密钥；
- 输出清理和长度限制。

## 使用其他本地端口或部署地址

可选环境变量：

```powershell
$env:JUDGE_PORT="9000"
$env:JUDGE_HOST="127.0.0.1"
$env:JUDGE_ALLOWED_ORIGINS="http://localhost:5173,https://你的游戏域名"
```

部署到服务器时应把 `JUDGE_HOST` 设为平台要求的监听地址，并将真实游戏域名加入 `JUDGE_ALLOWED_ORIGINS`。生产环境还应在平台层增加身份验证、费用限额与日志脱敏。

## 自己实现端点

游戏会向端点发送 JSON `POST`：

```json
{
  "task": "floating-life-cards-narration",
  "instruction": "用不超过70个汉字……",
  "chapter": "没有经验的人",
  "situation": "招聘方把你的简历翻到背面……",
  "card": {
    "title": "不藏的试卷",
    "memory": "最难的十秒很快过去了。",
    "approach": "行动"
  },
  "intent": {
    "title": "资历门槛",
    "text": "规章试图把你挡在故事开始之前。",
    "approach": "洞察"
  }
}
```

端点只需返回：

```json
{ "text": "你把那张旧试卷推到桌面中央，先承认空白，再说自己怎样补上它。" }
```

非 2xx 状态、无效 JSON、缺少 `text` 或超过 5 秒没有响应时，浏览器会无缝退回本地叙述。
