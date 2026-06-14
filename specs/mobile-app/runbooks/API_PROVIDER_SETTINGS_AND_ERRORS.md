# API / Provider Settings 与错误说明 Runbook

> **状态**：M0 前交付控制面文档；**不含业务代码**。  
> **权威来源**：[`docs/MOBILE_PRODUCT_PLAN.md`](../../../docs/MOBILE_PRODUCT_PLAN.md) · [`M1`](../M1-local-product-foundation.md) · [`M2`](../M2-local-storage-and-diagnostics.md) · [`M3`](../M3-realtime-voice-and-token-exchange.md) · [`M6`](../M6-release-observability-and-mobile-e2e.md) · [`assets/ui/SCREEN_SPECS.md`](../assets/ui/SCREEN_SPECS.md)  
> **用户决策（2026-06）**：先实现 **mock/degraded + Settings 配置面板**；用户配置 API Key 后即可切 **live**；**禁止 silent mock / 伪装 live**；token exchange **先本地/LAN，不上线**。

---

## 1. 文档目的与范围

本 Runbook 定义移动 App **API 与 Provider 配置面板**、**状态枚举**、**错误分类与用户中文说明**、**mock/degraded 策略**、**配置来源与安全边界**，以及与 **M1/M2/M3/M6 gate** 的验收关系。

**范围内**：voice、LLM、news/radar（AdaptiveRadar）、storage、token exchange、diagnostics 六类 Provider 的配置 UX、状态机、错误矩阵、降级路径、测试 checklist。

**范围外**：具体 SDK 实现、monorepo 脚手架、package 脚本、云端 token exchange 部署（仅 ADR/契约占位）。

---

## 2. Provider 分类

| Provider ID | 用户可见名称 | 职责 | 典型实现 / 接口 | M 阶段 |
|-------------|--------------|------|-----------------|--------|
| **`voice`** | 语音 | Realtime 语音伴侣：听/说、barge-in、三意图 | `VoiceProvider`；豆包/火山 Realtime（M3+） | M1 mock 态；M3 live + token exchange |
| **`llm`** | 语言模型 | 讲细点、入库 proposal、auto-curate、画像蒸馏（不写图谱） | `LLMProvider` | M1 mock；配置 key 后 live |
| **`news_radar`** | 今日入口 / 雷达 | AdaptiveRadar 信号：资讯、学习、项目等 **按 UserMode** 选源 | `NewsSource` + AdaptiveRadar ranking | M1 fixture；M2+ env-gated live |
| **`storage`** | 本地存储 | SQLite 图谱/画像/候选/诊断；MigrationGate | `StorageProvider`（expo-sqlite） | M2 硬需 |
| **`token_exchange`** | 语音令牌交换 | 用设备身份换 **短期** Realtime token；**长期密钥不进包** | 本地/LAN BFF（M3 ADR） | M3 ADR + 客户端；**不上公网** |
| **`diagnostics`** | 诊断与导出 | ring buffer、crash 摘要、Provider 快照；**非 live API** | 本地 ring buffer + 可选 Sentry adapter（M6 optional） | M2 ring buffer；M6 export 硬需 |

**横切规则**：

- 各 Provider **独立状态**；Settings 汇总展示，但错误与重试 **按 Provider 分行**。
- **图谱/画像写入**仅经 ingest/auto-curate 门控；Provider 失败 **不得** silent 写 permanent 节点。
- **`diagnostics`** 只 **读** 其他 Provider 状态与 `reasonCode`；不发起用户业务 API 调用。

---

## 3. Settings 信息架构 —「API 与 Provider」板块

Settings 完整 IA 见 [`移动交付阻塞计划`](../../../docs/MOBILE_PRODUCT_PLAN.md) 与产品计划 Settings 章节；本节只定义 **「API 与 Provider」** 子树（M1 起占位，M2 起 Provider 面板硬验收）。

### 3.1 导航位置

```text
SettingsScreen
  ├─ 画像与纠偏（ProfileReview）          ← M1
  ├─ API 与 Provider                      ← 本节（M1 简版；M2 完整面板）
  ├─ 本地数据与备份                        ← M2+
  ├─ 权限与语音                            ← M1 占位；M3 完整
  ├─ 诊断与导出                            ← M2 ring buffer；M6 硬需
  └─ 关于 / 版本
```

入口：右上 `···`（见 [`SCREEN_SPECS.md`](../assets/ui/SCREEN_SPECS.md) §5）；**无底部 Tab**。

### 3.2 「API 与 Provider」页面结构

| 区块 | 字段 / 控件 | 说明 |
|------|-------------|------|
| **总览横幅** | 当前运行模式：`演示` \| `部分可用` \| `已连接` | 由 worst-case Provider 推导；**禁止**无 key 时显示「已连接」 |
| **LLM** | 状态 pill、模式 `mock`/`live`/`degraded`、最近错误一行 | API Key 输入（SecureStore）；「测试连接」 |
| **语音 Voice** | 状态 pill、`disconnected`/`mock`/`connecting`/`connected`/`degraded` | M2 默认 disconnected/mock；M3 起 token exchange + Realtime |
| **今日入口 Radar** | `fixture`/`live`/`degraded` | live 失败时 **明示** 使用 fixture，非 silent |
| **Token 交换** | BFF URL（开发/LAN）、连接状态、最近 `TokenExchangeError` | **默认** `http://127.0.0.1` 或局域网 IP；**不提供** 公网默认 |
| **存储 Storage** | `ready`/`migrating`/`degraded`、schema version | 只读；与 MigrationGate 联动 |
| **诊断 Diagnostics** | ring buffer 条数、上次导出时间 | 跳转「诊断与导出」 |
| **全局操作** | 「全部测试连接」「切回演示模式」「查看错误详情」 | 切演示 = 全部 mock/degraded **明示**，非隐藏 |

### 3.3 各 Provider 卡片 — 标准字段

每张 Provider 卡片 **必须** 包含：

| 字段 | UI 要求 | testId 建议（M2+） |
|------|---------|-------------------|
| **显示名** | 中文：语音 / 语言模型 / 今日入口 / … | — |
| **运行模式** | `mock` \| `live` \| `degraded`（storage 用 `ready`/`degraded`） | `provider-{id}-mode` |
| **连接状态** | 见 §4 状态枚举 | `provider-{id}-status` |
| **最近错误** | 中文摘要 + `reasonCode`（可展开详情） | `provider-{id}-last-error` |
| **最近成功** | ISO 时间或「从未成功」 | `provider-{id}-last-ok` |
| **操作** | 「测试连接」「重试」「切回演示」「文字兜底说明」（voice） | `provider-{id}-test` |

**API Key 输入（LLM / 可选 Radar）**：

- 单行密码框 + 「保存」；**不回显**完整 key；已配置时显示「已保存 ·•••••ab12」。
- 保存后立即触发 **可选** 一次 test connection；失败则 **保留** key 但标 `invalid_key` 或具体错误态。
- **清除密钥**：二次确认；清除后回 `unconfigured`/`mock`，**不得**仍显示 live。

**测试连接按钮**：

- 点击 → 卡片内联 `connecting` → 成功 `connected`（live）或明确 `mock`/`degraded` 结果。
- 超时（建议 15s）→ `network_error`；展示重试。
- 测试结果写入 ring buffer：`intent=provider_test`、`outcome`、`reasonCode`（**不含** key）。

**切换 mock / live / degraded**：

- 用户 **可强制**「演示模式（mock）」即使已配 key — 用于稳定演示脚本。
- 用户 **不可** 在无 key 时手动选 live（控件 disabled + 文案「请先配置 API Key」）。
- 自动 degraded（如限流）须 **横幅或卡片** 说明原因；Settings 与 DegradedMode 一致。

### 3.4 与 DegradedMode / 首页横幅的关系

| 层 | 职责 |
|----|------|
| **DegradedMode 枚举** | 全局旗标：`mock_llm`、`fixture_radar`、`voice_disconnected`、… |
| **Settings Provider 面板** | 各 Provider **明细状态** + 最近错误 + 操作 |
| **LivingBrainHome 横幅** | 可选；**省略横幅时** M3+ gate 仍须 Settings 证据（见 M3 §6.1） |

**禁止**：DegradedMode 激活但 Settings 显示 live；或首页无任何提示且实际走 mock。

### 3.5 中文 UI 文案原则

- 面向用户：**口语、可行动**；避免 HTTP 状态码直出（码进 `reasonCode`/详情）。
- **演示 / 模拟 / 部分可用 / 已连接** 四类词与 §4 状态一一对应，不混用「在线」。
- 错误详情可展开「技术信息」：`reasonCode`、时间、是否已重试；**默认折叠**。

---

## 4. 状态枚举

### 4.1 设计原则

- **运行模式**（mock/live/degraded）与 **连接状态**（connecting/connected/…）**正交**；UI 可同时展示「live + rate_limited」。
- 实现层可用单一 `ProviderStatus` 或 `{ mode, connection, lastError }`；文档以 **语义枚举** 为准。
- 所有状态须 **可映射到 Settings testId** 与 diagnostic `reasonCode`（M2+）。

### 4.2 运行模式（Mode）

| 枚举 | 中文 | 含义 |
|------|------|------|
| `mock` | 演示 | 故意使用 mock/fixture；**必须**明示 |
| `live` | 实时 | 使用真实 Provider；key/token 有效且策略允许 |
| `degraded` | 部分可用 | live 不可用时的 **显式** 降级（fixture LLM、文字-only 语音等） |

### 4.3 连接 / 配置状态（Connection & Config）

| 枚举 | 中文 | 典型 Provider | 说明 |
|------|------|---------------|------|
| `unconfigured` | 未配置 | llm, voice, token_exchange | 无 key / 无 BFF URL |
| `configured` | 已配置未测 | llm | 已存 key，尚未 test |
| `connecting` | 连接中… | voice, llm, token_exchange | 测试连接或会话建立中 |
| `connected` | 已连接 | voice, llm | live 且最近一次 health check 成功 |
| `disconnected` | 未连接 | voice | 默认；M2 语音未实现 |
| `degraded` | 部分可用 | 全部 | 见 §4.2；与 mode 叠加展示 |
| `invalid_key` | 密钥无效 | llm, voice（经 exchange） | 401/403、签名错误 |
| `quota_exceeded` | 额度用尽 | llm, voice | 套餐配额 / 免费额度耗尽 |
| `billing_required` | 需充值 | llm, voice | 余额不足、欠费停服 |
| `rate_limited` | 请求过快 | llm, voice, news_radar | 429 / 厂商限流 |
| `network_error` | 网络异常 | 全部 | 超时、DNS、无网络 |
| `provider_error` | 服务异常 | 全部 | 5xx、厂商维护、未知 API 错误 |
| `token_exchange_error` | 令牌交换失败 | token_exchange, voice | BFF 不可达、拒绝、过期 |
| `permission_denied` | 权限被拒 | voice | 麦克风；非 API key |
| `storage_unavailable` | 存储不可用 | storage | 对应 `StorageInitError` |
| `migrating` | 升级中 | storage | MigrationGate |

**精简映射（实现可选）**：`invalid_key`、`quota_exceeded`、`billing_required` 在 UI 可共用父态 **「账户或密钥问题」**，但 **reasonCode 必须细分** 以便诊断导出。

### 4.4 Provider × 默认状态（无用户配置）

| Provider | 默认 mode | 默认 connection | DegradedMode 联动 |
|----------|-----------|-----------------|-------------------|
| llm | `mock` | `unconfigured` | `mock_llm` |
| voice | `mock` | `disconnected` | `voice_disconnected` |
| news_radar | `mock` | `degraded`（fixture） | `fixture_radar` |
| storage | — | `migrating`→`ready` | MigrationGate |
| token_exchange | — | `unconfigured` | 触发 `voice_disconnected` |
| diagnostics | — | `ready` | 本地始终可用 |

---

## 5. 配置来源与安全

### 5.1 配置来源优先级

| 来源 | 适用 | 优先级 | 说明 |
|------|------|--------|------|
| **用户 Settings 输入** | LLM API Key、Radar 可选 key、Token BFF URL | 最高（App 内） | 写入 SecureStore；**不进** git / 打包 |
| **本地开发 env** | 工程师 `readAppEnv()` / dev-only 常量 | 仅 `__DEV__` | 不得进 release bundle；M3 须 scan + bundle grep |
| **Token exchange BFF** | 长期 provider 密钥 | 服务端/LAN only | App 只持 **短期 token** |
| **内置 mock/fixture** | 无 key 演示 | 默认 | 须 UI 标「演示」 |

**禁止**：复制 legacy `VITE_*` / `import.meta.env` 长期密钥进 App；mobile/core 仅经 **`readAppEnv()`** 读 **非密钥** 字段（endpoint、model id）。

### 5.2 存储位置 — 能存什么 / 不能存什么

| 数据 | 存储 | 生命周期 | 备份/导出 |
|------|------|----------|-----------|
| LLM / Radar **用户 API Key** | `expo-secure-store` | 长期直到用户清除 | **禁止**导出明文 |
| Realtime **短期 token** | `expo-secure-store` | TTL 内；可刷新 | **禁止**导出 |
| Token BFF **URL**（LAN） | SecureStore 或 SQLite 非敏感配置表 | 长期 | 导出 manifest **不含** key |
| Provider **状态快照**（mode、lastError、reasonCode） | SQLite `provider_config` 或等价 | 长期 | 诊断包 **可** 含 reasonCode；**不含** key |
| 长期 provider 密钥（volc、modelscope 等） | **不得**出现在 App | — | — |
| ring buffer 事件 | SQLite / 文件 ring | 循环覆盖 | 仅 §5.3 白名单字段 |

**SQLite 可存**：schema version、Provider 运行模式、最近错误码、测试连接时间戳、UserMode、非敏感 endpoint。

**SQLite 禁止存**：API key 明文、refresh token 明文、transcript、node 正文、画像敏感段落。

### 5.3 Token exchange — 本地/LAN 约束

| 项 | 决策 |
|----|------|
| 部署 | 开发者本机或局域网 BFF；**MVP 不上线公网** |
| App 默认 URL | 空或 `http://127.0.0.1:<port>/v1/token`（文档化，不硬编码密钥） |
| 失败行为 | `TokenExchangeError` → voice `token_exchange_error` + `voice_disconnected`；**文字三意图仍可用** |
| Gate | M3 可 mock exchange；**FULL PASS** 须 ADR + scan + bundle grep **无长期密钥** |
| 真机 | 真机访问 LAN BFF 须在 Runbook/ADR 说明同一 Wi‑Fi；**非 gate 阻塞** 时可 mock |

### 5.4 长期密钥不进包 — 验收

- 仓库：`pnpm run scan:secrets`（M3+ gate）。
- 产物：dev/preview **bundle artifact grep** 无 `volcAccessKey`、`modelscopeApiKey`、`sk-` 等。
- Share Extension / App Group：**无** 长期密钥（M4）。

---

## 6. 错误分类矩阵

### 6.1 图例

| 列 | 含义 |
|----|------|
| **阻塞图谱** | 是否阻止启动或读写 SQLite 主路径 |
| **文字兜底** | 用户是否仍可用文字完成三意图 / 核心闭环 |
| **保留 pending** | ingest proposal / provisional 候选是否必须保留 |

### 6.2 矩阵

| reasonCode / 错误类 | 检测信号（示例） | 用户中文说明 | 下一步操作 | 阻塞图谱 | 文字兜底 | 保留 pending |
|---------------------|------------------|--------------|------------|----------|----------|--------------|
| **`ProviderConfigError`** | 无 key；env 无效；factory 回退 mock | 「还没有配置 API Key，当前为**演示模式**。」 | Settings → 填写 Key → 测试连接 | 否 | 是 | 是（proposal） |
| **`invalid_key`** | HTTP 401/403；厂商「invalid api key」 | 「API Key 无效，请检查是否复制完整。」 | 修正 Key；或切演示模式 | 否 | 是 | 是 |
| **`billing_required`** | 402；余额/欠费文案 | 「账户余额不足，语音/模型服务已暂停。充值后再试，或先用演示模式。」 | 充值；或演示模式 + 文字 | 否 | 是 | 是 |
| **`quota_exceeded`** | 配额耗尽；「insufficient quota」 | 「本月额度已用完。可等额度恢复，或先用演示模式。」 | 等待周期；演示模式 | 否 | 是 | 是 |
| **`rate_limited`** | HTTP 429；Retry-After | 「请求太频繁，稍等几秒再试。」 | 自动退避重试；手动重试 | 否 | 是 | 是 |
| **`network_error`** | 超时；offline；DNS 失败 | 「网络连不上。请检查 Wi‑Fi 或移动数据。」 | 重试；离线继续看本地图谱 | 否 | 是（离线读库） | 是 |
| **`provider_error`** | HTTP 5xx；厂商维护 | 「服务暂时异常，不是你的问题。稍后再试。」 | 重试；演示模式 | 否 | 是 | 是 |
| **`TokenExchangeError`** | BFF 4xx/5xx；无 token；TTL 过期 | 「语音令牌获取失败。请检查局域网令牌服务，或先用打字聊天。」 | 检查 BFF URL/网络；重试；文字 | 否 | **是** | 是 |
| **`RealtimeVoiceTransportError`** | WS 断连；native transport 失败 | 「语音连接中断。你可以继续用文字。」 | 重连；文字 | 否 | 是 | 是 |
| **`IngestProposalError`** | LLM 无 proposal/超时/畸形 JSON | 「这条还没整理好，要再试一次吗？」 | 重试 proposal；**禁止半入库** | 否 | 是 | **必须** |
| **`StorageInitError`** | DB 无法打开；磁盘满 | 「大脑暂时醒不过来。请点重试，或先导出备份。」 | 重试；导出指引 | **是**（MigrationGate） | 否（主 UI） | N/A |
| **`SchemaMigrationError`** | migration SQL 失败 | 「数据升级失败。请勿卸载，联系支持并导出诊断。」 | MigrationScreen 重试/导出 | **是** | 否 | N/A |
| **`GraphTransactionError`** | coTransact 半写 | 「保存时出了点问题，这次改动可能没记下。」 | 单操作重试；persistWarning | 部分 | 视情况 | 是 |
| **`ProvisionalPersistError`** | 候选表写失败 | 「这条星尘还没存住，请再试一次。」 | 重试 | 否 | 是 | 内存+重试 |
| **`permission_denied`**（麦克风） | OS 拒绝 RECORD_AUDIO | 「听不到你——可以先用打字，或在设置里打开麦克风。」 | 系统设置；文字 | 否 | **是** | 是 |

### 6.3 错误 → Settings 展示映射

每条错误须同时写入：

1. 对应 Provider 卡片「最近错误」  
2. `DegradedMode`（若适用）  
3. ring buffer：`{ intent, outcome: 'fail'|'degraded', reasonCode }`（**无**自由文本 PII）

### 6.4 重试 / 切 mock / 文字兜底 — 标准路径

```text
API 调用失败
  → 分类 reasonCode（§6.2）
  → 更新 Provider 状态 + Settings 最近错误
  → 若可重试：指数退避 ≤3 次（network/provider/rate_limited）
  → 若不可恢复：degraded 或 mock（**更新 UI 模式 pill**）
  → voice 类：voice_disconnected + 文字三意图
  → ingest 类：保留 pending，**不** create permanent
  → 用户可选：Settings「切回演示模式」
```

**禁止路径**：失败 → silent mock 且 UI 仍显示 `connected` / live。

---

## 7. mock / degraded 策略

### 7.1 阶段允许 mock 的范围

| 阶段 | 允许 mock/degraded | 必须明示 UI | 不可仅凭 mock 解锁的 gate |
|------|-------------------|-------------|---------------------------|
| **M1** | llm、voice、radar 全 mock/fixture | Settings + 可选横幅 | M2 MigrationGate / SQLite |
| **M2** | 同上 + storage 仅 ready/migrating | **Provider 状态面板** testId | M3 barge-in / token exchange |
| **M3** | mock transport / mock exchange **仅 M3 内** | Settings `voice_disconnected` 等 | **M4-GATE FULL PASS** |
| **M4** | 捕获可 mock；语音笔记须 M3 | 同左 | M5 evidence 真数据 |
| **M6** | E2E `degraded.yaml` 断言 mock 可见 | 诊断导出含 provider 快照 | M7 同步/备份 |
| **M7** | 同步冲突与备份 **不得** mock 门控 | — | — |

### 7.2 UI 标识规范

| 场景 | 首页 | Settings |
|------|------|----------|
| 全 mock | 可选顶栏「演示模式」 | 各 Provider mode = **演示** |
| llm mock | Degraded 条「模型为演示响应」 | LLM = mock |
| radar fixture | 「今日入口为示例内容」 | Radar = fixture/degraded |
| voice disconnected | VoiceOrb 仍可用 **文字** | Voice = 未连接 + 文字说明 |
| live 恢复 | 移除 Degraded 条 | mode = 实时，status = 已连接 |

**SCREEN_SPECS 对齐**：Partial 态「live→mock：Degraded 条常驻直至恢复」（[`SCREEN_SPECS.md`](../assets/ui/SCREEN_SPECS.md) §6）。

### 7.3 禁止 silent live — 硬规则

1. 无 API key 时 **不得** 显示「已连接 / 实时」  
2. mock/fixture 时 **不得** 使用与 live 相同的纯绿「已连接」态  
3. Provider 失败 fallback 必须 **更新 mode 或 connection 枚举**  
4. `legacy_radar`：**移动端禁止无声进入**（M1 gate）  
5. Gate 报告须附 Settings 截图或 testId 断言  

### 7.4 演示脚本（3–5 分钟）与 Provider 态

稳定演示推荐：

1. **刻意** Settings →「演示模式」或清空 Key → 全场 mock **明示**  
2. 冷启动 → AdaptiveRadar fixture → 三意图 → 入库  
3. 打开 Settings Provider 面板 → 展示状态与「测试连接」  
4. （可选）填入 Key → 测试连接 → 切 live **对比** UI 变化  

**禁止**：演示时 live UI 实际走 mock 无提示。

---

## 8. 与 M1 / M2 / M3 / M6 Gate 的关系

| Gate | Provider / Settings 要求 | 关键证据 |
|------|--------------------------|----------|
| **M1-GATE** | Settings 可见 provider/storage/voice/**profile**；DegradedMode **可见**；无 key 双闭环 | 无 API key ingest+capture eval；Settings mock 标识 |
| **M2-GATE** | **Provider 状态面板**（llm/radar/voice/storage）；与 DegradedMode 一致；`ProviderConfigError` SQLite 回归；ring buffer **白名单** | `Settings.test.tsx`；`m1RegistryOnSqlite.test.ts`；`ringBufferWhitelist.test.ts` |
| **M3-GATE** | Token exchange ADR；`voice_disconnected` Settings 证据；scan + bundle grep；barge-in 真机 | `m3-voice-degraded.md`；`degradedVoiceEvidence`；**不得** M4 FULL PASS 若 M3 未 PASS |
| **M6-GATE** | 诊断导出含 **provider 状态 + reasonCode**；**不含** key/正文；双端 smoke 含 Settings 诊断 | `export.test.ts`；`whitelist.test.ts`；`m6-*-smoke.md` |

**不阻塞 gate 但须文档化**：Token exchange 仅 LAN；无 Sentry；无 Apple/Google 账号。

**DEGRADED 与 gate**：阶段内可标 DEGRADED 继续修复，**不得**冒充 FULL PASS，**不得**解锁 M(n+1)（见 [`EXECUTION_GUARDRAILS.md`](../EXECUTION_GUARDRAILS.md) §5）。

---

## 9. 诊断导出（M6）Provider 字段白名单

诊断包 **允许**（与 M2 §2.1 一致并扩展 Provider 快照）：

```typescript
type ProviderDiagnosticSnapshot = {
  providerId: 'voice' | 'llm' | 'news_radar' | 'storage' | 'token_exchange' | 'diagnostics';
  mode: 'mock' | 'live' | 'degraded';
  status: string;           // §4 枚举之一
  reasonCode?: string;
  lastOkAt?: string;        // ISO8601
  lastErrorAt?: string;
  bffUrlHost?: string;      // 仅 host，无 path 密钥
  // 禁止：apiKey, token, transcript, node 正文
};
```

**禁止**：key、token、图谱 intro、transcript、画像 correction 长文。

---

## 10. 测试与验收 Checklist

### 10.1 父 agent — 文档完整性检查

- [ ] 本文档 §2 六类 Provider 均已定义  
- [ ] §3 Settings「API 与 Provider」含：字段、状态、测试连接、mock/live/degraded、最近错误  
- [ ] §5 明确 SecureStore / SQLite 存什么 **不** 存什么；长期 key 不进包  
- [ ] §4 状态枚举覆盖：unconfigured、mock、connected、degraded、invalid_key、quota、billing、rate_limit、network、provider、token_exchange  
- [ ] §6 错误矩阵含：检测信号、中文说明、下一步、阻塞图谱/文字兜底/pending  
- [ ] §7 mock 策略含：阶段允许范围、UI 标识、禁止 silent live、gate 关系  
- [ ] §8 M1/M2/M3/M6 关系表与 spec 无冲突  
- [ ] [`runbooks/README.md`](./README.md) 已索引本文档  

### 10.2 未来实现 — 单元 / 组件测试

| 测试 | 路径（建议） | 断言 |
|------|--------------|------|
| Provider 状态映射 | `apps/mobile/settings/providerStatus.test.ts` | 各 reasonCode → §4 状态 + 中文 copy |
| Settings Provider 面板 | `apps/mobile/screens/Settings.test.tsx` | mock 不显示 live；testId 齐全 |
| 无 key 默认 mock | `packages/core/providers/factory.test.ts` | factory 返回 mock + `ProviderConfigError` 不抛 uncaught |
| Key 保存 SecureStore | `apps/mobile/settings/secureStore.test.ts` | SQLite 无 key 明文 |
| 测试连接超时 | `apps/mobile/settings/testConnection.test.ts` | 15s → network_error |
| Ingest 失败 pending | `m1RegistryOnSqlite.test.ts` | `IngestProposalError` pending 仍在 |
| Token exchange 失败 | `apps/mobile/voice/tokenExchange.test.ts` | 不污染图谱；voice_disconnected |
| Ring buffer 白名单 | `ringBufferWhitelist.test.ts` | 无 key/transcript |

### 10.3 未来实现 — E2E / Eval

| 场景 | 路径 | Gate |
|------|------|------|
| mock 可见 | `apps/mobile/e2e/degraded.yaml` | M6 |
| Settings Provider 面板 | Maestro flow 打开 Settings → 断言「演示」 | M2/M6 |
| 无 key 主路径 | M1 ingest + capture eval | M1 |
| voice 降级 | `docs/evals/m3-voice-degraded.md` | M3 |
| 诊断导出无密钥 | `export.test.ts` | M2/M6 |

### 10.4 未来实现 — 安全

- [ ] M3：`pnpm run scan:secrets` exit 0  
- [ ] M3：bundle artifact grep 无长期密钥  
- [ ] `readAppEnv()` 无 `VITE_*` 直读密钥  
- [ ] Share Extension 无 key（M4 审查）

### 10.5 人工 / 真机验收

- [ ] 无 key：60s 闭环 + Settings 标 **演示**  
- [ ] 故意错误 key：`invalid_key` 中文 + 仍可用文字  
- [ ] 断网：`network_error` + 本地图谱可读  
- [ ] Token BFF 关闭：`TokenExchangeError` + 文字三意图  
- [ ] 填正确 key：测试连接 → live **且** UI 从演示变为实时  

---

## 11. 参考与变更记录

| 文档 | 关系 |
|------|------|
| [`MOBILE_PRODUCT_PLAN.md`](../../../docs/MOBILE_PRODUCT_PLAN.md) §7–§8 | 错误注册表、DegradedMode |
| [`M2-local-storage-and-diagnostics.md`](../M2-local-storage-and-diagnostics.md) §2.1 | ring buffer 白名单 |
| [`M3-realtime-voice-and-token-exchange.md`](../M3-realtime-voice-and-token-exchange.md) §5–§6 | token exchange、voice 降级 |
| [`EXECUTION_GUARDRAILS.md`](../EXECUTION_GUARDRAILS.md) | Provider 面板 M2 硬需、禁止 silent mock |
| [`SCREEN_SPECS.md`](../assets/ui/SCREEN_SPECS.md) §5–§6 | Settings IA、Error/Degraded 文案方向 |

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-06-13 | 初版：API/Provider Settings、错误矩阵、mock 策略、M1/M2/M3/M6 gate 关系 |
