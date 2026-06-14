# 移动 App 数据存储地图、生命周期与备份边界 Runbook

> **状态**：M0 前交付控制面文档；**不含业务代码、不含迁移实现**。  
> **权威来源**：[`PRODUCT.md`](../../../PRODUCT.md) · [`docs/MOBILE_PRODUCT_PLAN.md`](../../../docs/MOBILE_PRODUCT_PLAN.md) · [`M2`](../M2-local-storage-and-diagnostics.md) · [`M4`](../M4-quick-capture-and-provisional-queue.md) · [`M7`](../M7-sync-backup-and-long-term-trust.md) · [`API_PROVIDER_SETTINGS_AND_ERRORS.md`](./API_PROVIDER_SETTINGS_AND_ERRORS.md)  
> **用户关切**：知识图谱、用户画像、候选队列、诊断日志、API 密钥分别**放哪里**、**活多久**、**能否备份/导出**、**如何清除** — 本文档为唯一权威地图。

---

## 1. 文档目的与范围

本 Runbook 定义移动 App **数据分类**、**存储位置**、**生命周期**、**备份/导出/清除边界**、**最小 SQLite schema 建议**，以及与 **M2 / M4 / M7 gate** 的验收关系。

**范围内**：expo-sqlite 永久层、expo-secure-store 密钥层、内存/会话暂存、App Group / intent 暂存、ring buffer 诊断层、M7 加密备份包、未来 SyncProvider 元数据。

**范围外**：具体 Repository 实现、Drizzle/ORM 选型、迁移 SQL 代码、monorepo 脚手架、package 脚本。

**产品硬约束（不可违反）**：

| # | 约束 | 存储含义 |
|---|------|----------|
| 1 | 三层记忆分离 | raw audio / full article **不长期保存**；知识图谱 + 用户画像 **永久** |
| 2 | 新建概念 = 用户确认 | provisional 候选 ≠ permanent；唯一晋升 = `applyIngestCreate` |
| 3 | 入库后整理 = AI 自动 + 可撤销 | `change_history` 永久；undo 可恢复结构 |
| 4 | Delete = archive | `archived=1` 隐藏；**不 hard delete** 概念节点 |
| 5 | Local-first / MVP 无云后端 | 默认数据不出设备；M7 才用户主动备份/同步 |
| 6 | API key 安全 | 长期密钥 **不进包、不进 SQLite、不进备份/诊断** |

---

## 2. 数据分类总表

下表为 **权威分类**；实现时每张表/每类缓存须能映射到一行。

| 数据类 | 用户可见名称 | 存储位置（主） | 存储位置（辅） | 生命周期 | M7 加密备份 | 诊断导出 | 系统云备份（iCloud/Google） |
|--------|--------------|----------------|----------------|----------|-------------|----------|----------------------------|
| **知识图谱**（concepts + edges + sources） | 大脑星图 | `expo-sqlite` | 内存 hydrate 子图 | **永久**（archive 仍保留） | **是** | **否**（禁止 node 正文） | **默认排除** |
| **用户画像**（profile seed + UserModeProfile） | 懂你层 | `expo-sqlite` | — | **永久** | **是** | **否**（禁止敏感段落） | **默认排除** |
| **画像纠偏**（correction history + suppression） | 纠偏记录 | `expo-sqlite` | — | **永久** | **是** | **否** | **默认排除** |
| **变更历史 / undo**（graph change history） | 整理记录 | `expo-sqlite` | — | **永久** | **是** | **否** | **默认排除** |
| **Provisional 候选队列** | 待点亮星尘 | `expo-sqlite` | 内存 Zustand 镜像 | 直到用户处理或丢弃 | **是** | **否** | **默认排除** |
| **Quick capture staging** | 分享/OCR 暂存 | iOS **App Group** JSON；Android **intent extras** → 主 App 消费后写 SQLite | — | **短期**（分钟级；消费后清空 staging） | **否**（staging 本身） | **否** | **否** |
| **Ingest / provisional 元数据**（confirmedAt, ingestSource） | 入库来源标记 | `expo-sqlite`（节点/候选列） | — | 随实体永久/至候选删除 | **是** | **否** | **默认排除** |
| **Learning trace** | 学习轨迹 | `expo-sqlite` | — | **长期** | **是** | **否** | **默认排除** |
| **AdaptiveRadar / WorldItem 状态** | 今日入口状态 | `expo-sqlite` | 内存 ranking 缓存 | **长期** | **是** | **否** | **默认排除** |
| **Conversation / session scratch** | 当前会话上下文 | **内存 only** | 可选 ring buffer **意图码** | **session-only** | **否** | **否** | **否** |
| **Raw audio** | 录音缓冲 | **内存 only**（或 OS 临时 buffer） | — | **会话后丢弃** | **永不** | **永不** | **否** |
| **Full article / source raw** | 原文全文 | **不持久化** | 抓取时内存 ≤512KiB（M4 SSRF 上限） | **抓取后丢弃**；仅保留 **source link** | **永不** | **永不** | **否** |
| **API keys**（LLM / Radar 用户 key） | API 密钥 | `expo-secure-store` | — | 至用户清除 | **永不** | **永不** | **否** |
| **Short-lived tokens**（Realtime JWT 等） | 语音短期令牌 | `expo-secure-store` | 内存热缓存 | **TTL**（厂商决定；可刷新） | **永不** | **永不** | **否** |
| **Provider 配置状态**（mode, lastError, reasonCode） | Provider 状态 | `expo-sqlite` `provider_config` | Settings UI 镜像 | **长期配置** | **是**（**不含** key） | **是**（白名单快照） | **默认排除** |
| **Token BFF URL**（LAN，非密钥） | 令牌服务地址 | SecureStore 或 SQLite 非敏感列 | — | 长期 | manifest **仅 host** | **仅 host** | **默认排除** |
| **Diagnostic ring buffer** | 诊断事件 | `expo-sqlite` `diagnostic_events` 或 sandbox 日志文件 | — | **ring buffer 截断**（容量上限循环覆盖） | **否** | **是**（白名单） | **否** |
| **Backup / export packages** | 加密备份文件 | 用户选择路径（Files / Drive / WebDAV） | — | **用户控制** | 自身即备份 | N/A | 用户自选 |
| **Sync metadata**（M7B） | 同步游标 / 冲突 ID | `expo-sqlite` `sync_metadata` | SyncProvider 远端 | **长期** | **是** | **否** | **默认排除** |
| **Pending ingest proposal** | 待整理入库提案 | `expo-sqlite` | 内存 | 至确认/重试/丢弃 | **是** | **否** | **默认排除** |
| **App meta**（schema version 等） | 数据库元信息 | `expo-sqlite` `app_meta` | — | **永久** | **是** | **是**（version only） | **默认排除** |

**图谱 vs 画像路径说明（用户关切）**：

```text
App Sandbox
  └─ SQLite（expo-sqlite）: mybrain.db          ← 知识图谱 + 用户画像 + 候选 + history 永久层
       ├─ concepts / edges / sources           ← 知识图谱（② 永久层）
       ├─ user_profile / user_mode_profile     ← 用户画像（③ 永久层）
       ├─ profile_correction_history          ← 纠偏（画像子集，永久）
       ├─ provisional_items                   ← 候选（确认前不进图谱）
       ├─ graph_history / change_history      ← 自动整理 + undo
       └─ …（见 §7 schema）

  └─ SecureStore                              ← API key、短期 token（不进 SQLite）
  └─ App Group / intent staging               ← 分享扩展短期 payload（M4）
  └─ Memory                                   ← raw audio、transcript、会话 scratch（会话后丢）
```

---

## 3. 存储位置详解

### 3.1 `expo-sqlite`（App Sandbox 永久层）

**路径**：`{ApplicationSandbox}/SQLite/mybrain.db`（文件名常量 `STORAGE_DB_NAME = "mybrain.db"`，与 legacy 对齐）。

**写入规则**：

- 图谱节点/边、画像、候选、history、learning trace、radar state、provider 非敏感配置、sync metadata。
- 图谱 + history **同事务**（`coTransactGraphAndHistory`）；禁止半写入 permanent 而无 history。
- MigrationGate 成功前 **禁止** LivingBrainHome 挂载读写。

**禁止写入**：

- API key / refresh token 明文  
- transcript / raw audio 字节  
- full article 正文  
- 画像 correction **长文理由**（history 表仅存结构化 diff + 短 summary）

### 3.2 `expo-secure-store`

对齐 [`API_PROVIDER_SETTINGS_AND_ERRORS.md`](./API_PROVIDER_SETTINGS_AND_ERRORS.md) §5.2：

| 键（示例） | 内容 | 备注 |
|------------|------|------|
| `llm_api_key` | 用户 LLM API Key | 清除 = Settings 二次确认 |
| `radar_api_key` | 可选 Radar key | 同左 |
| `realtime_token` | 短期 Realtime JWT | TTL 过期自动失效 |
| `token_bff_url` | LAN BFF 地址 | 可改存 SQLite 若仅 host |

### 3.3 Memory only（会话层）

| 数据 | 允许存在时长 | 丢弃时机 |
|------|--------------|----------|
| Raw audio PCM/编码缓冲 | 单次语音回合 | 回合结束 / barge-in 后 **立即释放** |
| STT partial / TTS 队列 | 单次会话 | 会话 idle 超时或 App 后台策略回收 |
| Transcript 全文 | 单次会话 | **不得**落 SQLite；仅可蒸馏画像信号后丢弃 |
| Conversation scratch（context pack） | 单次会话 | 杀进程即失；重启从 SQLite hydrate 画像/图谱，**不**恢复 transcript |
| URL 抓取 body（M4） | 单次 fetch | ≤512KiB 内存；摘要写入 provisional 后 **丢弃 body** |

### 3.4 iOS App Group staging（M4）

| 项 | 值 |
|----|-----|
| 容器 | App Group `group.{bundleId}.share` |
| 格式 | JSON payload schema（`share_payload_v1`） |
| 内容 | url / title / mime / thumbnail ref；**无** API key |
| 生命周期 | Extension 写入 → 主 App 消费 → **删除 staging 文件** |
| 备份 | **不**进入 M7 备份 manifest |

### 3.5 Android intent extras / temp

| 项 | 值 |
|----|-----|
| 入口 | `ACTION_SEND` intent filter |
| 暂存 | intent extras → 主 Activity 处理队列；大文件 **content URI** 临时读 |
| 生命周期 | 处理完毕释放 URI；持久化仅 **provisional SQLite** |
| 密钥 | Extension/Activity **无** SecureStore 长期密钥 |

### 3.6 Filesystem export（用户主动）

| 类型 | 路径 | 格式 |
|------|------|------|
| M2 诊断包 | 用户分享 sheet 导出 | JSON zip；§6 白名单 |
| M2 图谱 JSON 导出 | 用户 Settings 触发 | JSON；**不含** raw audio |
| M7A 加密备份 | 用户选择外部存储 | 加密容器 + `backup_manifest` |

### 3.7 未来 SyncProvider（M7B）

| 项 | 值 |
|----|-----|
| 本地 | `sync_metadata` 表：last_sync_at、device_id、conflict_ids、resume_token |
| 远端 | 用户自选（WebDAV / 私有中继 / 第二设备）；**MVP 无官方云** |
| 门控 | 远端 new node **无** `user_confirmed_ingest` → **仅 provisional** |

---

## 4. 生命周期策略

| 生命周期类 | 数据 | 触发丢弃/归档 | 用户可逆 |
|------------|------|---------------|----------|
| **永久** | 图谱（含 archived）、画像、correction、history、confirmed 节点 | 仅「清空图谱/画像」重置（危险操作） | archive 可恢复；history undo |
| **直到用户处理** | provisional 候选、pending ingest proposal | 用户「不要」/ 丢弃候选 | 否（丢弃即删候选行） |
| **TTL** | Realtime token | 过期 / 刷新失败 | 重新 exchange |
| **Session-only** | raw audio、transcript、conversation scratch | 回合或会话结束 | 否 |
| **Ring buffer 截断** | diagnostic_events | 条数或字节上限（建议 ≤500 条或 ≤256KB） | 否（最旧丢弃） |
| **Staging 短期** | App Group / intent payload | 主 App 消费或 24h 清理 job | 否 |
| **备份保留** | 加密备份文件 | **用户**删除外部文件 | 用户可从备份恢复 |
| **抓取临时** | full article body | 摘要生成后 | 否 |

**原始音频与全文（硬约束）**：

```text
语音采集 → 内存 buffer → Realtime/蒸馏 → 画像信号写入 SQLite
                         ↘ transcript 内存 → 会话结束丢弃（不写库）
分享/OCR → 内存/临时文件 → LLM 摘要 → provisional 表
                         ↘ full article body 丢弃；仅 source_url 进图谱（用户确认后）
```

---

## 5. 备份与导出策略

### 5.1 分层总览

| 层级 | 时机 | 内容 | 加密 |
|------|------|------|------|
| **系统云备份** | OS 自动 | **默认排除**明文 `mybrain.db` | — |
| **M2 用户 JSON 导出** | 用户 Settings | 图谱 + 画像 + 候选（可选勾选） | 可选明文；须隐私提示 |
| **M2/M6 诊断导出** | 用户 Settings | ring buffer + provider 快照 + schema version | 否；**白名单** |
| **M7A 加密备份** | 用户触发 | §5.2 manifest 实体全集 | **必须**用户口令/密钥 |
| **M7B 同步包** | SyncProvider | §5.2 中「同步=是」实体 | 传输层 TLS + 可选 E2E |

### 5.2 M7A 备份 manifest 实体（与 M7 §2.1.1 对齐）

**必须包含**（`included_entities[]`）：

- `graph_snapshot`（concepts + edges + sources，含 `archived`）
- `graph_history` / `change_history`
- `user_mode_profile` + `user_profile` KV
- `profile_correction_history` + `profile_suppression_list`
- `learning_traces`
- `provisional_items`（含 `confirmedAt`, `ingestSource`）
- `world_items`
- `adaptive_radar_state`
- `provider_config`（**无** key）
- `app_meta` / `schema_version`
- `sync_metadata`（若已有）

**永不进入备份**：

- API key、refresh token、Realtime token 明文  
- raw audio、transcript  
- full article body  
- ring buffer 原始事件（可单独诊断导出，**不**进加密备份）  
- App Group staging 文件  
- 画像敏感明文（**默认**；用户 opt-in 须二次确认 UI）

### 5.3 诊断导出白名单

与 M2 §2.1、API Runbook §9 一致。

**允许字段**：

```typescript
type DiagnosticEvent = {
  intent: string;
  outcome: 'ok' | 'fail' | 'degraded' | 'skipped';
  reasonCode: string;
  userMode?: string;       // 非敏感 slug
  ts?: string;
  schemaVersion?: number;
  appVersion?: string;
  platform?: 'ios' | 'android';
};

type ProviderDiagnosticSnapshot = {
  providerId: string;
  mode: 'mock' | 'live' | 'degraded';
  status: string;
  reasonCode?: string;
  lastOkAt?: string;
  lastErrorAt?: string;
  bffUrlHost?: string;     // 仅 host
};
```

**禁止**：node title/intro、transcript、画像 correction 长文、API key、token、设备广告 ID、PII 自由文本。

### 5.4 iOS / Android 系统备份排除

| 平台 | 配置 | Gate 证据 |
|------|------|-----------|
| iOS | `NSURLIsExcludedFromBackupKey` on DB 目录 | M2 `ios_backup_exclude` |
| Android | `backup_rules.xml` 排除 `databases/` | M2 `android_backup_exclude` |

用户 **主动** M7A 导出不受此限 — 那是用户显式选择离开设备。

---

## 6. 清除与重置策略

Settings「本地数据与备份」须提供下列能力（实现期 M2 设计 / M7 完善 UX）。

| 操作 | 影响范围 | SQLite | SecureStore | Staging | 确认级别 |
|------|----------|--------|-------------|---------|----------|
| **清除 LLM/Radar API Key** | Provider | `provider_config` 重置 mode | 删除 key 键 | — | 一次确认 |
| **清除短期 token** | Voice | — | 删除 token 键 | — | 可静默（登出语音） |
| **清空 Provisional 候选** | 候选队列 | `DELETE FROM provisional_items` | — | 清空 staging | 一次确认 |
| **清空 Pending ingest** | 待提案 | 删除 pending proposal 行 | — | — | 一次确认 |
| **归档节点恢复** | 图谱 | `archived=0` | — | — | 常规 UI |
| **清空知识图谱** | concepts/edges/sources/history |  truncate 图谱相关表 | — | — | **二次确认** + 输入确认词 |
| **清空用户画像** | profile/mode/correction | truncate 画像相关表 | — | — | **二次确认** + 说明不可自动推断恢复 |
| **清空诊断日志** | ring buffer | `DELETE FROM diagnostic_events` | — | — | 一次确认 |
| **恢复 Provider 默认** | mock 演示 | 重置 `provider_config` | 可选保留 key | — | 一次确认 |
| **导出后重置**（演示） | 全库 | 导入备份前可选 wipe | 可选清 key | 清空 | **三次确认** + 备份已完成提示 |
| **卸载 App** | 全部 | OS 删除 sandbox | OS 删除 SecureStore | — | 系统行为 |

**Archive vs Hard delete**：

| 用户动作 | 存储行为 |
|----------|----------|
| 删除过时概念 | `concepts.archived = 1`；边迁移到替代节点；history 记录 |
| 用户「不要」候选 | **硬删** `provisional_items` 行（从未进 permanent） |
| 同步删除意图（M7B） | 远端 → 本地 **archive**，不 `DELETE` concept |
| 清空图谱重置 | truncate（演示/危险）；与 archive 不同，须极强确认 |

---

## 7. 最小 SQLite Schema 建议

> **说明**：字段级建议，供 M2 migration 设计；**不是**迁移代码。命名与 legacy `src/storage/migrations.ts` 对齐并扩展 mobile 专有表。

### 7.1 `app_meta`

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | TEXT PK | 如 `schema_version`, `graph_schema_version` |
| `value` | TEXT | 字符串化版本号 |

### 7.2 `concepts`（知识图谱节点）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | UUID |
| `title` | TEXT | 概念名 |
| `intro` | TEXT | 短简介（非新闻碎片） |
| `source_url` | TEXT NULL | 来源链接；**不存**全文 |
| `archived` | INTEGER | 0=活跃，1=归档隐藏 |
| `confirmed_at` | TEXT NULL | 用户确认入库时间（M7 门控） |
| `ingest_source` | TEXT NULL | `voice`\|`text`\|`share`\|`sync` |
| `salience` | REAL | 显著性 |
| `created_at` / `updated_at` / `last_touched_at` | TEXT | ISO8601 |

### 7.3 `edges`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | |
| `source_id` / `target_id` | TEXT FK → concepts | |
| `relation_type` | TEXT | 是一种/依赖/替代/相关 |
| `archived` | INTEGER DEFAULT 0 | 边归档 |

### 7.4 `sources`（概念附属来源链接，可选规范化）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | |
| `concept_id` | TEXT FK | |
| `url` | TEXT | https only |
| `label` | TEXT NULL | 短标签 |
| `fetched_at` | TEXT NULL | 抓取时间；**无**正文 |

### 7.5 `user_profile`

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | TEXT PK | 画像 KV（兴趣、习惯等） |
| `value` | TEXT | JSON 或纯文本 |

### 7.6 `user_mode_profile`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | 固定 `default` |
| `primary_mode` | TEXT | UserMode 枚举 |
| `secondary_modes_json` | TEXT | JSON 数组 |
| `confidence` | REAL | 0–1 |
| `recent_intent` | TEXT NULL | 非敏感摘要 |
| `last_correction_at` | TEXT NULL | ISO8601 |
| `profile_version` | INTEGER | M7 合并版本 |

### 7.7 `profile_correction_history`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | |
| `at` | TEXT | ISO8601 |
| `field` | TEXT | 被纠偏字段 |
| `before_json` / `after_json` | TEXT | 结构化 diff；**非**长文抱怨 |
| `source` | TEXT | `manual`\|`behavior`\|`llm` |
| `superseded` | INTEGER | 合并标记 |

### 7.8 `profile_suppression_list`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | |
| `key` | TEXT | 被压制画像项 |
| `reason_code` | TEXT NULL | 短码 |
| `created_at` | TEXT | |

### 7.9 `provisional_items`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | |
| `title` / `summary` | TEXT | 候选摘要；**非**全文 |
| `source_url` | TEXT NULL | |
| `source_type` | TEXT | `share`\|`ocr`\|`voice_note`\|`radar`\|`sync` |
| `status` | TEXT | `pending`\|`explaining`\|`discarded` |
| `ingest_source` | TEXT NULL | 晋升后写入 concept |
| `confirmed_at` | TEXT NULL | 晋升时填 |
| `created_at` / `updated_at` | TEXT | |

### 7.10 `graph_history` / `change_history`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | |
| `at` | TEXT | |
| `kind` | TEXT | merge/archive/link/edge_migrate/ingest/… |
| `summary` | TEXT | 短描述 |
| `before_json` / `after_json` | TEXT | 快照 diff |
| `undone` | INTEGER | 撤销标记 |
| `edge_migrations_json` | TEXT NULL | 边迁移记录 |

### 7.11 `learning_traces`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | |
| `concept_id` | TEXT NULL FK | |
| `event_kind` | TEXT | |
| `payload_json` | TEXT | 结构化；**非** transcript |
| `at` | TEXT | |

### 7.12 `world_items`（AdaptiveRadar / MemoryWeather 支撑）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | |
| `kind` | TEXT | |
| `payload_json` | TEXT | |
| `radar_cursor` | TEXT NULL | |
| `updated_at` | TEXT | |

### 7.13 `adaptive_radar_state`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | `default` |
| `cursor_json` | TEXT | 游标/去重状态 |
| `updated_at` | TEXT | |

### 7.14 `provider_config`

| 字段 | 类型 | 说明 |
|------|------|------|
| `provider_id` | TEXT PK | voice/llm/news_radar/storage/token_exchange |
| `mode` | TEXT | mock/live/degraded |
| `status` | TEXT | §API Runbook §4.3 |
| `last_error_code` | TEXT NULL | reasonCode |
| `last_ok_at` / `last_error_at` | TEXT NULL | |
| `config_json` | TEXT NULL | **非敏感** endpoint、model id |

**禁止列**：`api_key`, `token`, `secret`

### 7.15 `diagnostic_events`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK AUTO | 单调递增便于 ring 截断 |
| `at` | TEXT | |
| `intent` | TEXT | |
| `outcome` | TEXT | |
| `reason_code` | TEXT | |
| `user_mode` | TEXT NULL | slug only |
| `meta_json` | TEXT NULL | schemaVersion 等 |

### 7.16 `sync_metadata`（M7B 预埋，M2 可 NULL）

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | TEXT PK | device_id / last_sync / resume_token |
| `value` | TEXT | |
| `updated_at` | TEXT | |

### 7.17 `pending_ingest_proposals`（可选，与 agent_proposals 合并）

可与 legacy `agent_proposals` 统一：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | TEXT PK | |
| `status` | TEXT | pending/… |
| `payload_json` | TEXT | proposal；**非** permanent |
| `created_at` | TEXT | |

### 7.18 Schema 版本

| meta key | 初始值 | 说明 |
|----------|--------|------|
| `schema_version` | `1` | mobile DB 总版本 |
| `graph_schema_version` | 对齐 legacy KP-07+ | 图谱子版本 |

---

## 8. 隐私与安全

| 风险 | 控制 |
|------|------|
| 原始音频长期留存 | **仅内存**；禁止写 SQLite / 文件 / 备份 |
| 全文 article 留存 | 仅 `source_url` + 短 summary；SSRF 抓取 body 内存限时丢弃 |
| API key 泄露 | **仅 SecureStore**；禁止 SQLite、日志、备份、诊断、App Group |
| 短期 token 泄露 | SecureStore + TTL；诊断仅 `token_exchange_error` **码** |
| 系统云备份带走明文 DB | iOS excluded-from-backup + Android backup_rules |
| 诊断包泄露知识 | 白名单字段；export 扫描测试（M2/M6） |
| Share Extension 密钥 | Extension **无** SecureStore 长期密钥 |
| 画像过度导出 | 默认备份不含敏感明文；opt-in 二次确认 |
| LLM 蒸馏越界 | 记忆引擎/蒸馏 **不写** permanent 图谱（仅画像信号）；新建节点仍须用户确认 |

**日志禁令**：ring buffer / crash 摘要 **不得**含 transcript、node intro、画像 correction 原文、key 片段。

---

## 9. 与 M2 / M4 / M7 Gate 的关系

### 9.1 M2 — Local storage + diagnostics

| 要求 | 存储地图对应 | 缺证据不能 PASS |
|------|--------------|-----------------|
| MigrationGate 硬门 | §3.1 启动链 | migration 中挂载 LBH |
| 图谱+画像+候选+correction 杀进程恢复 | §2 永久层 | kill process E2E 失败 |
| iOS/Android 排除系统云备份 | §5.4 | 无 backup_rules / excluded 证据 |
| Ring buffer 白名单 | §5.3 | `ringBufferWhitelist.test.ts` 失败 |
| Provider 面板（非敏感 SQLite） | §7.14 | Settings testId 缺失 |
| 用户 JSON 导出（无 sensitive） | §5.1 M2 导出 | 导出含 transcript/正文 |
| `confirmed_at` / `ingest_source` 列存在 | §7.2/7.9 | migration 无列 |
| API key 不在 SQLite | §3.2 | 扫描发现 key 明文 |

### 9.2 M4 — Quick capture + provisional queue

| 要求 | 存储地图对应 | 缺证据不能 PASS |
|------|--------------|-----------------|
| Provisional 仅 SQLite 候选 | §2 provisional | 确认前写 concepts |
| App Group / intent staging 短期 | §3.4/3.5 | Extension 含 key |
| 分享全文不进 permanent | §4 抓取临时 | SSRF 后 silent 入库 |
| 杀进程候选仍在 | §2 候选 | provisional 未落盘 |
| ingestSource / share 路径 | §7.9 | 来源字段缺失 |
| ConversationConductor 唯一晋升 | §6 archive 表 | bypass `applyIngestCreate` |

### 9.3 M7 — Backup + sync

| 子 gate | 要求 | 缺证据不能 PASS |
|---------|------|-----------------|
| **M7A** | §5.2 manifest 最小实体 round-trip | 任一实体丢失；含 key/token |
| **M7A** | 加密备份 + 恢复事务原子性 | 半写入图谱无 profile |
| **M7A** | 诊断/备份不含 raw audio/transcript | 扫描失败 |
| **M7B** | sync 未确认节点 → provisional only | silent permanent create |
| **M7B** | correction history 合并不 silent 覆盖 | 手动纠偏被 LLM 覆盖 |
| **M7B** | `sync_metadata` 与冲突 UI | 无冲突策略记录 |

**MVP 边界**：M0–M6 **不要求** M7 备份/同步实现；但 M2 schema **须预埋** M7 字段（`confirmed_at`, `profile_version`, `sync_metadata`）。

---

## 10. 与 API Runbook 的交叉引用

| 主题 | 本文档 | API Runbook |
|------|--------|-------------|
| SecureStore vs SQLite | §3.1–3.2 | §5.2 |
| Provider 状态落盘 | §7.14 | §5.2, §9 |
| Ring buffer 白名单 | §5.3 | §5.3, §9 |
| Token exchange | §3.2 TTL | §5.3 |
| 诊断导出 | §5.3 | §9 |
| 长期密钥不进包 | §8 | §5.4 |

**冲突时**：安全边界以 **更严格** 为准；gate 验收两文档均须满足。

---

## 11. 父 Agent 验收 Checklist

### 11.1 文档完整性

- [ ] §2 数据分类总表覆盖：知识图谱、用户画像、provisional、session scratch、raw audio、full article、API keys、tokens、provider status、ring buffer、backup 包、sync metadata、quick capture staging、change history  
- [ ] 每类数据明确 **主存储位置**（sqlite / secure-store / memory / filesystem / App Group / intent / SyncProvider）  
- [ ] §4 生命周期：永久、归档、ring 截断、session-only、TTL、备份保留  
- [ ] §5 备份/导出：M7 加密备份实体、诊断白名单、永不导出列表  
- [ ] §6 清除/重置：分粒度操作 + archive vs hard delete  
- [ ] §7 最小 schema：concepts、edges、sources、user_profile、user_mode_profile、provisional、change_history、provider_config、diagnostic_events、sync_metadata  
- [ ] §8 隐私：音频/全文不长期保存；key 不进 SQLite/备份/诊断  
- [ ] §9 M2/M4/M7 gate 关系与缺证据 FAIL 条件  
- [ ] [`runbooks/README.md`](./README.md) 已索引本文档  
- [ ] 与 [`API_PROVIDER_SETTINGS_AND_ERRORS.md`](./API_PROVIDER_SETTINGS_AND_ERRORS.md) §5 无冲突  

### 11.2 用户关切专项

- [ ] 知识图谱路径：`expo-sqlite` `concepts/edges/sources` 写清  
- [ ] 用户画像路径：`user_profile` + `user_mode_profile` + correction 表写清  
- [ ] 候选 vs 永久：provisional 与 concepts 边界写清  
- [ ] 会话丢弃层：memory only 音频/transcript 写清  

### 11.3 未来实现抽查（M2 起）

- [ ] `secureStore.test.ts`：SQLite 无 key 明文  
- [ ] `ringBufferWhitelist.test.ts`：拒绝 intro/transcript/key  
- [ ] `export.test.ts`：用户导出无 sensitive  
- [ ] `backupManifest.test.ts`（M7A）：实体清单完整  
- [ ] `ingestGate.test.ts`（M7B）：sync 门控  

---

## 12. 参考与变更记录

| 文档 | 关系 |
|------|------|
| [`docs/MOBILE_PRODUCT_PLAN.md`](../../../docs/MOBILE_PRODUCT_PLAN.md) | P0 storage-map 阻塞项；§11 Settings「本地数据与备份」 |
| [`M2-local-storage-and-diagnostics.md`](../M2-local-storage-and-diagnostics.md) | MigrationGate、ring buffer、备份排除 |
| [`M4-quick-capture-and-provisional-queue.md`](../M4-quick-capture-and-provisional-queue.md) | App Group、provisional、SSRF |
| [`M7-sync-backup-and-long-term-trust.md`](../M7-sync-backup-and-long-term-trust.md) | manifest、sync 门控 |
| [`EXECUTION_GUARDRAILS.md`](../EXECUTION_GUARDRAILS.md) | M2/M4/M7 gate 机器验收 |
| legacy [`src/storage/migrations.ts`](../../../src/storage/migrations.ts) | 图谱 baseline schema |

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-06-13 | 初版：数据地图、schema 建议、备份/清除边界、M2/M4/M7 gate |
