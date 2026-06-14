# 移动 App 完整操作面：Settings、演示、性能、无障碍与依赖许可

> **状态**：M0 前交付控制面文档；**不含业务代码、不含 monorepo 实现、不改 package 脚本**。  
> **权威来源**：[`docs/MOBILE_PRODUCT_PLAN.md`](../../../docs/MOBILE_PRODUCT_PLAN.md) · [`assets/ui/SCREEN_SPECS.md`](../assets/ui/SCREEN_SPECS.md) · [`assets/ui/DESIGN_SYSTEM.md`](../assets/ui/DESIGN_SYSTEM.md) · 各 [`M*.md`](../README.md)  
> **交叉引用（不重复全文）**：  
> - Provider 配置与错误矩阵 → [`API_PROVIDER_SETTINGS_AND_ERRORS.md`](./API_PROVIDER_SETTINGS_AND_ERRORS.md)  
> - 存储路径 / 清除粒度 / 备份实体 → [`DATA_STORAGE_MAP_AND_BACKUP.md`](./DATA_STORAGE_MAP_AND_BACKUP.md)  
> - Windows 构建 / Sideloadly / Appetize gate 边界 → [`WINDOWS_EAS_SIDELOADLY_APPETIZE.md`](./WINDOWS_EAS_SIDELOADLY_APPETIZE.md)

---

## 1. 文档目的与范围

本 Runbook 定义移动 App **完整 Settings 信息架构（IA）**、**危险操作与备份恢复 UX**、**权限文案**、**演示就绪脚本**、**性能预算**、**无障碍验收**、**依赖与许可证上线前检查**，以及 **M 阶段 gate 映射**。

**范围内**：Settings 六板块结构、testId/验收点、演示与故障脚本、perf/a11y 阈值、许可 checklist、父 agent 验收清单。

**范围外**：Provider 错误码全表、SQLite schema 字段级定义、EAS/Sideloadly 逐步操作、具体 SDK 集成代码。

---

## 2. Settings 完整信息架构

### 2.1 导航与入口

| 项 | 规格 |
|----|------|
| **路由** | `SettingsScreen`（单屏分组列表 + 子页 push） |
| **入口** | LivingBrainHome 右上 `···` 或轻设置图标；**无底部 Tab**（见 [`SCREEN_SPECS.md`](../assets/ui/SCREEN_SPECS.md) §0） |
| **首屏分组顺序** | 画像与纠偏 → API 与 Provider → 本地数据与备份 → 权限与语音 → 诊断与导出 → 关于/版本 |
| **全局 testId** | `settings-screen` |

子页返回：系统手势 / 导航栏「返回」；Settings 内切换不丢未保存 Provider key（保存前离开须确认）。

### 2.2 板块总览

| # | 板块 | 目的 | 首版 M 阶段 | 完整验收 M 阶段 |
|---|------|------|-------------|-----------------|
| 1 | 画像与纠偏 | 让用户看见并修正 AI 对自己的推断；信任优先级 **手动 > 行为 > LLM** | M1 ProfileReview v0 | M2 持久化 correction history |
| 2 | API 与 Provider | 配置/诊断 voice、LLM、Radar、token exchange、storage；**禁止 silent mock** | M1 简版状态 | M2 Provider 面板硬需；M3 voice live |
| 3 | 本地数据与备份 | 说明本机 SQLite、占用、导出、加密备份/恢复、清除/重置 | M2 导出 + 清除设计 | M7A 加密备份 round-trip |
| 4 | 权限与语音 | 麦克风/通知/文件/网络说明；语音可用性、barge-in、文字兜底 | M1 占位 + 麦克风文案 | M3 完整语音态 |
| 5 | 诊断与导出 | 导出诊断包；版本/设备/build；**不含知识正文** | M2 ring buffer | M6 export 硬需 + CI |
| 6 | 关于/版本 | 版本号、schema、隐私说明、演示模式说明 | M1 版本只读 | M6 双端 smoke 对齐 |

---

### 2.3 板块 1 — 画像与纠偏（ProfileReview）

**目的**：冷启动与持续使用产生的 `UserModeProfile`、兴趣推断、suppression list 对用户**可见、可改、可删**；纠偏后 **同 session 重路由** AdaptiveRadar。

| 控件 / 区域 | 说明 | M 阶段 | testId | 验收点 |
|-------------|------|--------|--------|--------|
| 当前主模式 | 显示 `primaryMode` 中文名 + 置信度条 | M1 | `profile-primary-mode` | 冷启动 fixture ≥3 种模式可识别 |
| 次要模式 | `secondaryModes` 多选 chips | M1 | `profile-secondary-modes` | 混合模式 fixture 可展示 |
| 修改模式 | 「改成…」→ 模式 picker | M1 | `profile-edit-mode` | 改后 AdaptiveRadar 卡片 **同 session** 切换 |
| 最近推断 | 列表：推断摘要 + 信心 | M1 | `profile-inference-list` | 至少 1 条 fixture 可见 |
| 纠偏操作 | 每项「这不是我」→ suppression | M1 | `profile-reject-inference-{id}` | 进入 suppression；不得立即推回 |
| 纠偏历史 | 可展开；可删除单条 correction | M2 | `profile-correction-history` | 杀进程后仍在 SQLite |
| 删除画像种子 | 危险：清空 profile 相关表 | M2 | `profile-clear-seed` | 见 §3 危险分级 |

**口语原则**（Settings 内）：「这不是我」而非「删除用户」；避免「模型错误」等技术词。

**Gate**：M1-GATE ProfileReview + correction history；M2-GATE SQLite 持久化。

---

### 2.4 板块 2 — API 与 Provider

**目的**：用户与演示者能看清 mock/live/degraded、配 key、测连接、理解错误与降级路径。

> **细节**（卡片字段、状态枚举、错误矩阵、SecureStore 规则）见 [`API_PROVIDER_SETTINGS_AND_ERRORS.md`](./API_PROVIDER_SETTINGS_AND_ERRORS.md) §3–§6。本节只列 IA 与验收锚点。

| 控件 / 区域 | 说明 | M 阶段 | testId | 验收点 |
|-------------|------|--------|--------|--------|
| 总览横幅 | `演示` / `部分可用` / `已连接`（worst-case 推导） | M1 | `provider-summary-banner` | 无 key 时 **不得** 显示「已连接」 |
| LLM 卡片 | mode、key 输入、测试连接、最近错误 | M1/M2 | `provider-llm-*` | 与 DegradedMode `mock_llm` 一致 |
| Voice 卡片 | disconnected/mock/connecting/connected | M2/M3 | `provider-voice-*` | M3 `voice_disconnected` 可断言 |
| Radar 卡片 | fixture/live/degraded | M1/M2 | `provider-radar-*` | live 失败 **明示** fixture |
| Token exchange | BFF URL、连接状态 | M3 | `provider-token-exchange-*` | 长期密钥不进包（M3 scan） |
| Storage 卡片 | ready/migrating/degraded、schema version | M2 | `provider-storage-*` | MigrationGate 联动 |
| Diagnostics 跳转 | 链到「诊断与导出」 | M2 | `provider-diagnostics-link` | 只读条数 |
| 全局操作 | 「全部测试连接」「切回演示模式」 | M2 | `provider-test-all`, `provider-demo-mode` | 演示模式 **明示** mock |

**Gate**：M2-GATE Provider 面板 + `Settings.test.tsx`；M3-GATE voice live + degraded 证据。

---

### 2.5 板块 3 — 本地数据与备份

**目的**：回答「数据在哪、占多少、能否带走、如何清空」；区分 **归档** 与 **危险清空**；M7 前也可导出 JSON。

> **存储位置与清除粒度表**见 [`DATA_STORAGE_MAP_AND_BACKUP.md`](./DATA_STORAGE_MAP_AND_BACKUP.md) §2、§6。本节定义 **Settings UX**。

| 控件 / 区域 | 说明 | M 阶段 | testId | 验收点 |
|-------------|------|--------|--------|--------|
| 存储概览 | DB 路径说明（用户语言）、schema version、估算占用 | M2 | `data-storage-overview` | 显示 `schema_version` |
| 系统云备份说明 | 「默认不进 iCloud/Google 自动备份」 | M2 | `data-cloud-backup-notice` | iOS excluded + Android rules 证据 |
| 导出图谱 JSON | 用户主动分享 sheet | M2 | `data-export-graph-json` | 不含 raw audio / 画像敏感段 |
| 加密备份（M7A） | 创建/恢复；密码说明 | M7A | `data-backup-encrypted-*` | round-trip + manifest |
| 恢复备份 | 选文件 → 预览 manifest → 覆盖策略 | M7A | `data-restore-backup-*` | 见 §3.4 |
| 清空候选队列 | 一次确认 | M2 | `data-clear-provisional` | 仅 `provisional_items` |
| 清空 pending ingest | 一次确认 | M2 | `data-clear-pending-ingest` | proposal 不丢规则见 API runbook |
| 清空知识图谱 | **二次确认 + 确认词** | M2 设计 / M6 演示 | `data-clear-graph` | 见 §3 |
| 清空用户画像 | **二次确认** | M2 | `data-clear-profile` | 与图谱独立 |
| 清空诊断日志 | 一次确认 | M2 | `data-clear-diagnostics` | ring buffer 空 |
| 导出后重置（演示） | **三次确认** | M6 演示脚本 | `data-reset-after-export` | 见 §3.5 |
| 已归档节点 | 「查看已隐藏的概念」→ 列表恢复 | M2+ | `data-archived-nodes` | archive ≠ hard delete |

**Gate**：M2 导出 + 清除 UX 设计；M7A 加密备份；M6 演示重置流程可执行。

---

### 2.6 板块 4 — 权限与语音

**目的**：权限被拒时有**可行动中文路径**；语音不可用时文字三意图仍可用。

| 控件 / 区域 | 说明 | M 阶段 | testId | 验收点 |
|-------------|------|--------|--------|--------|
| 麦克风 | 系统权限态 + 跳转设置 | M1 文案 / M3 完整 | `perm-microphone-*` | 见 §4 |
| 通知（optional） | 本地提醒可选；非 gate 硬需 | M6 optional | `perm-notifications-*` | 拒绝不阻塞主路径 |
| 文件/分享 | 导出/备份/Share 所需 | M4/M7A | `perm-files-*` | Android SAF / iOS Files |
| 网络 | 说明离线可读本地图谱 | M2 | `perm-network-info` | 断网 smoke |
| 语音状态 | listening/thinking/speaking/interrupted | M3 | `voice-state-indicator` | 与 Provider voice 一致 |
| Barge-in 说明 | 「说话就能打断我」 | M3 | `voice-barge-in-help` | 真机 P50 <300ms（M3） |
| 文字兜底 | 「用打字也一样」链到 Home 输入 | M1 | `voice-text-fallback` | 无麦克风可完成闭环 |

**Gate**：M3 语音矩阵；M6 权限文案合规。

---

### 2.7 板块 5 — 诊断与导出

**目的**：现场演示/试用出问题时，用户可导出**白名单**诊断包，便于定位版本与 Provider 态。

| 控件 / 区域 | 说明 | M 阶段 | testId | 验收点 |
|-------------|------|--------|--------|--------|
| 导出诊断包 | JSON/ZIP share sheet | M2 | `diag-export-bundle` | `export.test.ts` 无敏感正文 |
| 上次导出时间 | 只读 | M2 | `diag-last-export-at` | — |
| Ring buffer 条数 | 只读 | M2 | `diag-event-count` | 容量上限可配置 |
| 包含字段说明 | 折叠：含 version/reasonCode；**不含** node 正文 | M2 | `diag-whitelist-help` | 与 API runbook §5.3 一致 |
| 复制支持 ID | 匿名设备 id + build 号 | M6 | `diag-support-id` | smoke 记录可对齐 |

**Gate**：M2 ring buffer 白名单；M6-GATE diagnostic export 硬需。

---

### 2.8 板块 6 — 关于/版本

| 控件 / 区域 | 说明 | M 阶段 | testId | 验收点 |
|-------------|------|--------|--------|--------|
| App 版本 | `version` + `buildNumber` | M1 | `about-app-version` | 与 native 一致 |
| Schema 版本 | SQLite `schema_version` | M2 | `about-schema-version` | migration 对齐 |
| 构建类型 | dev / preview / production | M6 | `about-build-profile` | E2E/smoke 记录 |
| 演示模式说明 | mock/degraded 含义 | M1 | `about-demo-mode-help` | 与 Provider 横幅一致 |
| 隐私说明 | 轻量本地说明或 URL | M6 optional | `about-privacy` | 不上架可不外链 |
| 开源许可 | 跳转 §8 聚合页或外链 | M6 | `about-licenses` | §8 checklist |
| 数据存储摘要 | 链到「本地数据」或只读一段 | M2 | `about-data-local-first` | local-first 一句话 |

---

## 3. 重置 / 清除 / 备份恢复 UX

### 3.1 危险操作分级

| 级别 | 操作示例 | 确认次数 | UI 模式 |
|------|----------|----------|---------|
| **L0 信息** | 查看归档、导出 JSON | 0 | 直接执行 |
| **L1 低危** | 清空诊断、清空候选、清除 API Key、恢复 Provider 默认 | 1 | Alert「确定吗？」+ 后果一句 |
| **L2 高危** | 清空知识图谱、清空用户画像 | 2 | 第一次 Alert → 第二次 **输入确认词** |
| **L3 极危** | 导出后全库重置（演示）、恢复备份覆盖本机 | 3 | L2 + 「我已备份」勾选 + 第三次确认 |

**视觉**：L2/L3 使用 `error` 色按钮；Destructive 按钮文案用动词「清空」而非「删除 App」。

### 3.2 确认词（L2 输入框）

| 操作 | 用户须输入 | 占位提示 |
|------|------------|----------|
| 清空知识图谱 | `清空星图` | 「输入「清空星图」以确认」 |
| 清空用户画像 | `清空画像` | 「输入「清空画像」以确认」 |
| 导出后全库重置 | `重置演示` | 「输入「重置演示」以确认」 |
| 恢复备份覆盖本机（M7A） | `覆盖恢复` | 「输入「覆盖恢复」以确认」 |

输入不匹配 → 确认按钮 disabled；**不提供** 默认填充。

### 3.3 Archive vs Hard delete — 用户可见说明

| 用户说法 | 实际行为 | Settings 提示文案 |
|----------|----------|-------------------|
| 「不要这条候选」 | **硬删** provisional 行 | 「这条星尘会消失，还没进入你的星图。」 |
| 「删除过时概念」 | **归档** `archived=1`；边迁移 | 「概念会藏起来，整理记录里还能找回。」 |
| 「清空星图」（L2） | **truncate** 图谱相关表 | 「这会清空所有已点亮的概念，**不是**隐藏。建议先导出。」 |
| 同步远端删除（M7B） | 本地 **archive** | 「其他设备的删除会在这里隐藏，不会真抹掉。」 |

**禁止**：在「删除概念」普通流程中使用 truncate；**禁止** L2 文案暗示 archive 可一键恢复（truncate 不可）。

### 3.4 备份提醒与恢复覆盖策略（M7A）

**创建备份前**（Banner）：

> 「备份文件会离开手机，请存到你信任的位置。密码丢了，备份无法打开。」

**恢复前**（三步）：

1. 展示 manifest：`schema_version`、实体数量、**不含** API key  
2. 选择策略：**合并**（仅 M7B）/ **覆盖本机**（M7A 默认路径）  
3. L3 确认词 `覆盖恢复` → 执行 → 成功则 **重启 hydrate**；失败 **不 partial commit**（事务回滚）

**失败回滚提示**：

> 「恢复没完成，你原来的数据还在。请换一份备份或导出诊断给我们。」

**密钥丢失**：明确 **不可恢复**；不提供「找回密码」假希望。

> 实体清单与 manifest 字段见 [`DATA_STORAGE_MAP_AND_BACKUP.md`](./DATA_STORAGE_MAP_AND_BACKUP.md) §5、M7 spec。

### 3.5 演示重置流程（M6 现场 / 录屏前）

**目标**：3–5 分钟演示前，回到 **可重复 cold-start fixture** 状态。

```text
1. Settings → 诊断与导出 → 导出诊断包（可选，留证据）
2. Settings → 本地数据 → 导出图谱 JSON（强烈建议）
3. Settings → API 与 Provider → 「切回演示模式」（保留或清除 key 按脚本分支）
4. Settings → 本地数据 → 「导出后重置」→ L3 确认
5. 杀 App → 冷启动 → 验证 empty_invite / cold_start fixture
```

**Fixture 分支**：

| 分支 | Provider | 预期首页 |
|------|----------|----------|
| 无 API key | 全部 mock/degraded 明示 | empty → cold start → adaptive |
| Live key | LLM/voice live（可选） | 同路径 + Provider「已连接」 |

**耗时预算**：重置全流程 **<90s**（不含导出大库）。

---

## 4. 权限文案矩阵

系统权限弹窗文案在 `app.json` / `Info.plist` / Android manifest；Settings 内展示 **拒绝后兜底**。

### 4.1 麦克风（必须 — M3）

| 场景 | 中文短文案（Settings / 内联） | 拒绝后兜底 |
|------|------------------------------|------------|
| 首次说明 | 「需要麦克风才能和你语音聊天。」 | — |
| 系统弹窗 subtitle（iOS `NSMicrophoneUsageDescription`） | 「my_brain 使用麦克风与你实时对话；音频不会长期保存。」 | — |
| 已拒绝 | 「听不到你——可以先用打字。」 | 按钮「去系统设置开启」→ `Linking.openSettings()`；Home 文字输入 **常显** |
| 已拒绝 + 语音按钮 | 「麦克风未开启」 | VoiceOrb 点击 → 同上 + 不 crash |

**testId**：`perm-microphone-denied-banner`

### 4.2 通知（optional — M6）

| 场景 | 中文短文案 | 拒绝后兜底 |
|------|------------|------------|
| 说明 | 「可选：本地提醒帮你回顾记忆天气。」 | 主路径不依赖通知 |
| 已拒绝 | 「没有通知权限也没关系。」 | 隐藏通知相关设置或标「未开启」 |

### 4.3 文件 / 分享 / 照片（M4/M7A）

| 场景 | 中文短文案 | 拒绝后兜底 |
|------|------------|------------|
| 导出/备份 | 「需要文件权限才能把备份存到你选的位置。」 | 提供「复制到剪贴板」仅 **小** 诊断包；大导出解释限制 |
| Android 分享入站 | 「允许接收分享的内容，才能从其他 App 捕获。」 | M4 候选入口灰显 + 「去设置」 |
| iOS 照片/OCR（若用） | 「仅在你选择截图时读取。」 | OCR 入口隐藏 |

### 4.4 网络

| 场景 | 中文短文案 | 拒绝后兜底 |
|------|------------|------------|
| 离线 | 「当前离线。你仍可以查看已保存的星图。」 | 本地 SQLite 可读；Provider 标 degraded |
| 仅 LAN token | 「语音需要与电脑上的令牌服务在同一 Wi‑Fi。」 | 文字可用；见 API runbook TokenExchange |

### 4.5 本地存储（非 OS 权限，用户教育）

| 场景 | 中文短文案 |
|------|------------|
| 占用满 | 「手机存储空间不足，大脑暂时写不进去。」→ 重试 / 导出 / 清空诊断 |
| DB 损坏 | 「数据升级失败。请勿卸载，先导出诊断。」→ MigrationScreen |

**与错误矩阵关系**：Provider/API 类错误见 [`API_PROVIDER_SETTINGS_AND_ERRORS.md`](./API_PROVIDER_SETTINGS_AND_ERRORS.md) §6；本节只覆盖 **OS 权限 + 存储教育**。

---

## 5. Demo Readiness（演示就绪）

### 5.1 演示形态对照

| 形态 | 适用 | 覆盖能力 | Gate 关系 |
|------|------|----------|-----------|
| **本机演示** | 自用 iPhone + Android 真机 | **完整** M0–M7 主体能力 | M6/M7 **真机证据**主路径 |
| **远程 Appetize** | 无设备观众、UI smoke | UI/导航/部分 mock 语音 | **`REMOTE_DEMO_ONLY`**；见 [`WINDOWS_EAS_SIDELOADLY_APPETIZE.md`](./WINDOWS_EAS_SIDELOADLY_APPETIZE.md) §5、§7 |
| **录屏 + 真机** | 对外分享 | 同本机 | 可附在 gate report |
| **Expo Go** | M0–M1 开发 | 无 M3+ 原生语音/Share Ext | **不得** M3+ gate |

**硬规则**：**M6-GATE、M7-GATE 不能仅用 Appetize 声称 PASS**；Appetize **不替代** barge-in、Share Extension、换机备份、双端 smoke。

### 5.2 演示模式分支

| 模式 | 配置 | 脚本要点 |
|------|------|----------|
| **无 API key** | 全部 mock/degraded **明示** | 强调 60s 个性化闭环仍可用；Settings 横幅「演示」 |
| **Live key** | LLM +（可选）voice + LAN BFF | 先 Settings 测连接；失败切 degraded 分支 |
| **故障演示** | 注入/断网/拒麦克风 | 见 §5.4 |

### 5.3 标准 3–5 分钟演示脚本（稳定路径）

**前置**：执行 §3.5 演示重置（或 fixture DB）；双端之一真机；屏幕录制可选。

| 分钟 | 步骤 | 屏幕 | 验收可见 |
|------|------|------|----------|
| 0:00–0:30 | 冷启动 | Launch → Home `empty_invite` 或 cold start | 非资讯列表首页 |
| 0:30–1:30 | 冷启动对话 | ColdStartDialogue | ≥1 模式识别；首颗星来自对话 |
| 1:30–2:30 | AdaptiveRadar + 三意图 | `adaptive_live` 单卡 | 「讲细点」→「记住这个」→ 点亮动画 |
| 2:30–3:00 | 语音打断（M3+） | VoiceOrb | barge-in 停播；无 M3 则文字演示 |
| 3:00–3:30 | 点星摘要 | Constellation tap | NodeSummaryCard |
| 3:30–4:00 | Settings Provider | Provider 面板 | mock/live 状态可读 |
| 4:00–4:30 | 诊断/导出 | 导出诊断包 | 白名单；无 node 正文 |
| 4:30–5:00 | ProfileReview | 改模式或「这不是我」 | Radar 重路由 |

**Maestro 对齐**：`apps/mobile/e2e/mainpath.yaml` 须覆盖 ingest 路径；演示脚本可复用其步骤 ID。

### 5.4 故障演示脚本（可选加演）

| 故障 | 触发 | 预期 UX | 证据 |
|------|------|---------|------|
| 无 API key | 不配置 key 启动 | Degraded + 「演示模式」 | Settings `provider-summary-banner` |
| Key 无效 | 故意错误 key | `invalid_key` 中文 | Provider 卡片 |
| 无网络 | 飞行模式 | 离线读图谱 + network 文案 | offline E2E |
| 麦克风拒绝 | 系统拒绝 | §4.1 兜底 + 文字三意图 | Maestro permission yaml |
| Token exchange 失败 | 关 BFF | `TokenExchangeError` + 文字 | `m3-voice-degraded.md` |
| DB migration 失败 | fixture 坏库 | MigrationScreen 阻塞 | M2 MigrationGate |
| 备份恢复失败 | 坏 manifest | 回滚提示 §3.4 | M7A eval |

### 5.5 演示 artifact 清单（M6 报告）

- [ ] `docs/evals/demo-script-standard.md`（步骤 + 时间戳）  
- [ ] 录屏或截图路径  
- [ ] Appetize 链接（若有）标 **`REMOTE_DEMO_ONLY`**  
- [ ] 真机 smoke 链接 **`m6-ios-smoke.md` / `m6-android-smoke.md`**（gate 主证据）

---

## 6. 性能预算

### 6.1 指标总表

| 指标 | 预算 | 测量环境 | 首次强制 M 阶段 | Gate / 证据 |
|------|------|----------|-----------------|-------------|
| **冷启动 → 首屏可交互** | P50 **<2.5s**；P95 **<4s** | 中端真机 dev/preview；**非** Appetize | M1 日志；M6 真机 | M6 smoke 记录 |
| **LaunchScreen 最长展示** | **≤1.8s**（migration 除外） | 同左 | M1 | [`SCREEN_SPECS.md`](../assets/ui/SCREEN_SPECS.md) §1 |
| **MigrationGate 完成** | P50 **<3s**（常规迁移）；失败阻塞 | Dev Client | M2 | `MigrationGate.test.tsx` |
| **Graph hydrate（首屏）** | P50 **<800ms**；加载 **30–80** 节点 | 真机；1k 节点库 fixture | M2 | M2 perf 日志 |
| **VoiceOrb 动画** | 60fps 目标；jank **<5%** 帧 | 真机 | M3/M5 | 目检 + perf 可选 |
| **Barge-in 停播延迟** | P50 **<300ms** | 真机 | M3 | **`NEEDS_DEVICE_EVIDENCE`** 若缺 |
| **MemoryReplay 冷启动读** | P50 **<500ms** 首批 change | 真机；万节点 fixture | M5 | `m5-replay-perf.md` |
| **诊断导出** | **<5s**（1 万条 ring buffer 内） | 真机 | M6 | `export.test.ts` + smoke |
| **Settings 首屏渲染** | P50 **<400ms** | 同首屏 | M2 | 组件测试可选 |
| **Appetize / 云端模拟** | **不纳入** perf gate | 浏览器模拟 | — | 仅 UI smoke；标注失真 |

### 6.2 节点与渲染预算

| 规则 | 阈值 | M 阶段 |
|------|------|--------|
| 首页可见节点 | **30–80** | M1 起 |
| 万级节点库 | 仅聚合 / 搜索 / Replay；**禁止**全量 force graph | M5 |
| Skia/Reanimated 同时运行层 | 星图 + VoiceOrb + 单卡；避免全屏 blur 堆叠 | M5 深调 |

### 6.3 低端机 / Appetize 说明

| 环境 | 说明 |
|------|------|
| **低端 Android** | 首屏节点取 **30** 下限；Reduce Motion 默认尊重系统 |
| **Appetize** | 麦克风/蓝牙/Share Ext **不仿真**；perf 数字 **不可** 写入 M6 PASS |
| **iOS Sideloadly** | 以 **自用真机** 为准；签名过期不 perf 对比 |

### 6.4 性能失败 — stop condition

- 首屏 >80 节点 mount → **M1/M5 FAIL**  
- Replay 全表 scan → **M5 HARD_STOP**  
- Migration 未完成挂 Home → **M2 HARD_STOP**  
- 真机 perf 无 artifact 却声称 M5/M6 PASS → **HARD_STOP**

---

## 7. 无障碍（a11y）

### 7.1 目标级别

- **WCAG 2.2 AA** 为设计目标；M6 gate **最低**交付下列项，不追求一次满分但须 **可验收**。
- 参考：[`DESIGN_SYSTEM.md`](../assets/ui/DESIGN_SYSTEM.md) §9；RN 实现须 `accessibilityRole` / `accessibilityLabel` / `accessibilityState`。

### 7.2 动态字体（Dynamic Type / 字体缩放）

| 项 | 规格 | M 阶段 |
|----|------|--------|
| 缩放范围 | 支持系统 **100%–200%**（iOS Content Size；Android fontScale） | M2 起 |
| 布局 | 情境卡、Settings 列表 **多行换行**；禁止固定高度截断关键操作 | M2 |
| 极限 | 200% 时 VoiceOrb + 三意图仍 **同屏可达**（可折叠星座为 28%） | M6 抽检 |
| testId | `a11y-font-scale-regression`（Maestro 可选） | M6 |

### 7.3 VoiceOver / TalkBack

| 元素 | accessibilityLabel（中文） | hint | M 阶段 |
|------|---------------------------|------|--------|
| VoiceOrb | 「语音助手，双击开始说话」 | 「说话时随时打断」 | M1 占位；M3 态同步 |
| VoiceOrb `listening` | 「正在听」 | — | M3 |
| VoiceOrb `speaking` | 「正在说，双击打断」 | — | M3 |
| 三意图按钮 | 「记住这个」「先不用」「多说点」 | 与可见文案一致 | M1 |
| 星座星点 | 「概念：{title}，{intro 前 20 字}」 | 「双击查看摘要」 | M2 |
| Settings 入口 | 「设置」 | — | M1 |
| Provider 状态 pill | 「语言模型，演示模式」等 **完整朗读** | — | M2 |
| Degraded 横幅 | 朗读 banner 全文 | — | M1 |

**禁止**：仅依赖颜色区分 mock/live；须 **文字 + accessibilityState**。

### 7.4 触控目标

| 项 | 规格 |
|----|------|
| 最小点击区域 | **44×44 pt**（[`DESIGN_SYSTEM.md`](../assets/ui/DESIGN_SYSTEM.md) §9） |
| 三意图 / VoiceOrb / Settings 行 | 满足 44pt 或扩大 hitSlop |
| 星点 | 视觉可小，**hitSlop ≥44pt** |

### 7.5 颜色对比

| 对 | 最低对比度 | 验证 |
|----|------------|------|
| `text` on `background` | **≥4.5:1** | Light + Dark 各 1 截图审查 |
| `textSecondary` 正文 | **≥4.5:1** 或仅 caption | M6 checklist |
| `warning`/`error` on `surface` | **≥3:1** 大文本 | Degraded 横幅 |

### 7.6 Reduce Motion

| 项 | 规格 |
|----|------|
| 检测 | `AccessibilityInfo.isReduceMotionEnabled()` / CSS `prefers-reduced-motion` |
| 效果 | 星座呼吸、VoiceOrb pulse、nodeBloom **改为静态或 150ms fade** |
| 不削弱 | 三意图、Settings 仍全功能 |
| testId | `a11y-reduce-motion-active` 快照（可选） |

### 7.7 VoiceOrb 替代文本路径

**原则**：语音非唯一入口。

| 路径 | 说明 |
|------|------|
| 文字输入 | Home 底栏始终可达（冷启动期与 VoiceOrb 二选一展示，见 SCREEN_SPECS） |
| 三意图按钮 | 与语音等价 |
| Settings → 权限与语音 | 「用打字也一样」 |
| Screen reader | VoiceOrb 朗读态 + 双击激活（非仅长按） |

**Gate**：M6 a11y 抽检 **≥5 条** VoiceOver/TalkBack 通过记录；Reduce Motion 截图 1 组。

---

## 8. 依赖与许可证检查

> **不引入新依赖**；上线前、对外分享 APK/IPA 前、开源披露前执行。

### 8.1 必查依赖类别

| 类别 | 预期组件 | 许可关注点 | 检查方式 |
|------|----------|------------|----------|
| 框架 | React Native、Expo SDK | MIT / 混合；Expo 服务条款 | `pnpm licenses` / Expo docs |
| 导航 | Expo Router | MIT | package.json |
| 存储 | expo-sqlite、better-sqlite3（仅 dev） | MIT | 同上 |
| 安全 | expo-secure-store | MIT | 同上 |
| 动效 | react-native-reanimated、@shopify/react-native-skia | MIT | Skia 原生二进制 NOTICE |
| 字体 | DM Sans、Noto Sans SC | OFL 1.1 | 保留 `OFL.txt`；子集化记录 |
| 图标 | @expo/vector-icons 或自定义 SVG | 各 icon set 许可 | 禁止混用未授权商用 icon |
| 语音 | 豆包/火山 Realtime SDK（M3） | **厂商 ToS**；是否允许 sideload 分发 | ADR + 法务备注 |
| OCR | on-device ML Kit / Vision（M4 若用） | Google/Apple 平台条款 | 仅设备端 |
| 测试 | Maestro、Detox、Vitest | Apache/MIT | CI 不计入 ship bundle |
| Optional | Sentry SDK | BSL / 商业 | optional adapter；默认 off |

### 8.2 发布前 checklist

- [ ] 生成 **`THIRD_PARTY_NOTICES.md`**（或 App 内「开源许可」页）列出 MIT/OFL/Apache 组件  
- [ ] 字体 **OFL** 保留版权声明；**禁止** 仅 rename 不保留 license  
- [ ] 图标集来源可追溯（禁止 random Flaticon 无许可）  
- [ ] Skia/Reanimated **原生 .so** 对应 NOTICE 已打包（Android `licenses/`；iOS Settings bundle）  
- [ ] 语音 SDK **API Key 条款**允许当前分发方式（Sideloadly 自用 vs 商店）  
- [ ] 无 GPL/AGPL 组件 **静态链接**进 App（若引入须 HARD_STOP 评审）  
- [ ] `pnpm audit` 无 **critical** 未解（或 waiver 进 M6 报告）  
- [ ] Expo 预构建原生目录 **不手改** 第三方 NOTICE 删除  

### 8.3 与产品分发形态

| 分发 | 许可额外要求 |
|------|--------------|
| Android APK  sideload | 附「第三方开源说明」文本或 App 内 About |
| iOS Sideloadly 自用 | 同上；语音 SDK ToS 确认 |
| Appetize 公开链接 | 不上传含 **预置 API key** 的 build |
| 未来商店 | 补充 Privacy Nutrition / Data Safety；与本节 NOTICE 合并 |

---

## 9. M 阶段与 Runbook 映射

| M | 本 Runbook 章节 | 硬验收摘要 |
|---|-----------------|------------|
| M1 | §2.3 ProfileReview；§2.4 Provider 简版；§4 麦克风文案占位；§5.3 演示脚本 ingest | 双 eval；Degraded 可见 |
| M2 | §2.4 Provider 面板；§2.5 导出/清除；§2.7 诊断；§6 hydrate/migration | Provider 面板 testId；ring buffer 白名单 |
| M3 | §2.6 语音完整；§4.1；§6 barge-in | voice degraded 证据；真机 barge-in |
| M4 | §4.3 分享权限 | Share/intent 真机 |
| M5 | §6 Replay perf | `m5-replay-perf.md` |
| M6 | §5 全套演示；§6 真机 perf；§7 a11y 抽检；§8 NOTICE | 双端 smoke + E2E CI + diagnostic export |
| M7A | §3.4 备份恢复 | 加密 round-trip |
| M7B | §3.3 archive 同步语义 | ingest gate |

---

## 10. 父 Agent 验收 Checklist

### 10.1 文档完整性

- [ ] §2 Settings **六板块**均有：目的、关键控件、M 阶段、testId、验收点  
- [ ] §2 与 [`SCREEN_SPECS.md`](../assets/ui/SCREEN_SPECS.md) §5 **无结构冲突**（Profile/Provider/数据/外观）  
- [ ] §3 危险分级 L0–L3、确认词、archive vs truncate、演示重置流程完整  
- [ ] §3 与 [`DATA_STORAGE_MAP_AND_BACKUP.md`](./DATA_STORAGE_MAP_AND_BACKUP.md) §6 **粒度一致**（不重复 schema 全文）  
- [ ] §4 覆盖：麦克风、通知 optional、文件/分享、网络、本地存储教育  
- [ ] §5 含：本机 / Appetize / 无 key / live / 故障脚本；**明确 M6/M7 不替代 Appetize**  
- [ ] §5 与 [`WINDOWS_EAS_SIDELOADLY_APPETIZE.md`](./WINDOWS_EAS_SIDELOADLY_APPETIZE.md) §7 **gate 边界一致**  
- [ ] §6 性能预算含：启动、首屏、VoiceOrb、hydrate、migration、diagnostic export、Appetize/低端说明  
- [ ] §6 各指标标注 **首次强制 M 阶段** 与证据路径  
- [ ] §7 无障碍含：Dynamic Type、VoiceOver/TalkBack、44pt、对比度、Reduce Motion、VoiceOrb 文字替代  
- [ ] §8 依赖/许可：RN/Expo/SQLite/voice/icon/font；**无新增依赖**  
- [ ] [`runbooks/README.md`](./README.md) 已索引本文档  
- [ ] [`specs/mobile-app/README.md`](../README.md) 有最小指针（若适用）  

### 10.2 交叉引用无冲突

- [ ] Provider 错误与存储安全：**更严格者**为准（API + DATA runbooks）  
- [ ] 演示模式与 DegradedMode：三文档均要求 **明示 mock**  
- [ ] 诊断白名单：与 M2/M6 spec、`API_PROVIDER_SETTINGS_AND_ERRORS.md` §5.3 一致  

### 10.3 实现期抽查（M1 起）

- [ ] Settings E2E 或 Maestro 可打开六板块子页  
- [ ] L2 确认词 mismatch 时 destructive 不可点  
- [ ] `export.test.ts` + `ringBufferWhitelist.test.ts` 绿  
- [ ] 演示脚本 §5.3 可在 **无 key** 下 5 分钟内跑通  
- [ ] M6 报告含 **真机** smoke 与 Appetize（若有）**分开标注**  

---

## 11. 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-06-13 | 初版：Settings IA、危险操作 UX、权限/演示/perf/a11y/许可、父 agent checklist |
