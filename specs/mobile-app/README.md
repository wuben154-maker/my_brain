# Mobile App 实施索引（M 系列）

> **来源**：[`docs/MOBILE_PRODUCT_PLAN.md`](../../docs/MOBILE_PRODUCT_PLAN.md)  
> **定位**：iOS/Android **App-only** 产品化执行层；从 monorepo 地基到同步备份的 **阶段 0–7** 工作单。  
> **原则**：功能范围不缩水（HOLD SCOPE）；**User Evolution-first**；**M7-GATE** = 不公开上线完整成品验收；**M6-GATE** = 双端真机 M0–M5 主体能力 QA + 可观测性；`packages/core` 抽逻辑、`apps/mobile` 只做 UI 与平台适配。

## 执行护栏（M0 前必读）

无人干预、单窗口从 M0 顺序执行到 M7 时，**父 agent 与子 agent 必须先读**：

- **[`EXECUTION_GUARDRAILS.md`](./EXECUTION_GUARDRAILS.md)** — 角色分工、M0→M7 状态机、DoR/DoD、失败策略、禁止事项、命令矩阵、验收报告模板、返工预防清单
- **[`EXECUTION_STATE.schema.json`](./EXECUTION_STATE.schema.json)** — M0 起创建 `EXECUTION_STATE.json` 的状态锁 schema
- **[`STAGE_PROMPT_TEMPLATE.md`](./STAGE_PROMPT_TEMPLATE.md)** — 父 agent 派发 composer2.5 单阶段任务的固定模板
- **[`GATE_VERIFIER_SPEC.md`](./GATE_VERIFIER_SPEC.md)** — M0 起实现 `pnpm mobile:gate M0`…`M6`、`M7A`、`M7B`、聚合 `M7` 的机器验收规格
- **[`reports/`](./reports/)** — `M0`–`M6`、`M7A`、`M7B`、`M7` 阶段通行证目录
- **[`runbooks/APP_OPERATIONS_SETTINGS_DEMO_A11Y.md`](./runbooks/APP_OPERATIONS_SETTINGS_DEMO_A11Y.md)** — Settings 六板块 IA、演示/perf/a11y/许可与危险操作 UX（交叉引用 API/存储/Windows runbooks）
- **[`runbooks/DATA_STORAGE_MAP_AND_BACKUP.md`](./runbooks/DATA_STORAGE_MAP_AND_BACKUP.md)** — 图谱/画像/候选/密钥存储路径、备份与清除边界（M2/M4/M7 gate）
- **[`runbooks/WINDOWS_EAS_SIDELOADLY_APPETIZE.md`](./runbooks/WINDOWS_EAS_SIDELOADLY_APPETIZE.md)** — Windows 无 Mac：Android APK 分享、EAS `.ipa` + Sideloadly 自机 iOS、Appetize 远程演示

**硬规则：**

- **开始 M0 代码前**必须先读 guardrails；不得跳过。
- **全系列 Gate 验收**（M0–M7）均以 **[`GATE_VERIFIER_SPEC.md`](./GATE_VERIFIER_SPEC.md)** 为准：每阶段须产出对应 **`specs/mobile-app/reports/M{n}-GATE-report.md`**（M7 子门：`M7A`/`M7B`；总验收：`M7`），并运行 **`pnpm mobile:gate M{n}`**（M7 为 `M7A`/`M7B`/聚合 `M7`）；`PASS` 由 `EXECUTION_STATE.json`、报告、verifier 三者共同决定。
- M0-GATE 前必须创建 `EXECUTION_STATE.json` 与等价 verifier 脚本；后续阶段不得跳过 gate 报告或 verifier。
- 父 agent 派发子任务必须使用 `STAGE_PROMPT_TEMPLATE.md`，一次只允许当前 M 阶段。
- **M7-GATE = 完整功能验收**（= **不公开上线的完整成品** gate）；= **M7A-GATE PASS** + **M7B-GATE PASS**；须附录 **M0–M6 + M7A + M7B 全部阶段验收报告**（`M0`…`M6`、`M7A`、`M7B` 各一份 `*-GATE-report.md`）且均为 PASS。
- **M7A-GATE** = 换机恢复 + 加密备份（**优先 PASS**）；**M7B-GATE** = 双向 SyncProvider + 冲突合并。
- **M6-GATE ≠ 完整成品 / ≠ 公开上线**；= 双端真机 **M0–M5 主体能力 QA** + **ring buffer/diagnostic export（硬需）** + **移动 E2E（硬需）**；**Sentry optional**；**不含** M7 同步/备份；TestFlight/Play/EAS Submit 为 **optional release track**，缺账号不 FAIL gate。

## 与平铺 V/KOS 系列的关系

- **不移动** 已有 `specs/V*.md`、`specs/KOS-*.md`；历史链接保持有效。
- M 系列是 **移动端执行层**：复用 `src/domain/**`、`conversation/**`、`storage/types.ts`、`providers/**` 等，经 `packages/core` 迁移后由 `apps/mobile` 消费。
- Legacy Web/Tauri（`src/`）降为 dev surface，**不阻塞**移动主线。

## 产品不变量（全系列硬约束）

| # | 规则 | M 系列落地要点 |
|---|------|----------------|
| 1 | 三层记忆分离 | 原始音频/全文不长期保存；图谱与画像永久 |
| 2 | 新建概念 = 用户确认 | 分享/OCR/同步均不得 bypass「入/不要/讲细点」 |
| 3 | 入库后整理 = AI 自动 + 可撤销 | graph history undo；偶尔口头汇报 |
| 4 | 删除 = 归档 | Sync 合并时边迁移，不硬删 |
| 5 | 节点 = 概念 + 短简介 | 非新闻碎片 |
| 6 | 语音可打断 | barge-in 为硬需求（M3）；双端 AudioSession/AudioFocus |
| 7 | Local-first | MVP 无云后端；M7 同步不绕过入库门控 |
| 8 | User Evolution-first | 冷启动识别用户模式；`UserModeProfile`（非单一枚举）；AdaptiveRadar 非固定 AI 简报；M1 起 ProfileReview + correction history |

## Spec 索引

| 阶段 | Spec | 代号 | 依赖 | 验收门 | 一句话 |
|------|------|------|------|--------|--------|
| 0 | [M0-app-only-foundation](./M0-app-only-foundation.md) | `app-only-foundation` | — | **M0-GATE** | Monorepo + core 边界 + 文档对齐清单 |
| 1 | [M1-local-product-foundation](./M1-local-product-foundation.md) | `local-product-foundation` | M0-GATE | **M1-GATE** | ColdStart + UserModeRouting + AdaptiveRadar + 三意图 + ProfileReview |
| 2 | [M2-local-storage-and-diagnostics](./M2-local-storage-and-diagnostics.md) | `local-storage` | M1-GATE | **M2-GATE** | expo-sqlite + profile/mode 持久化 + MigrationGate |
| 3 | [M3-realtime-voice-and-token-exchange](./M3-realtime-voice-and-token-exchange.md) | `realtime-voice` | M2-GATE | **M3-GATE** | 真实语音 + token exchange + 双端语音矩阵 |
| 4 | [M4-quick-capture-and-provisional-queue](./M4-quick-capture-and-provisional-queue.md) | `quick-capture` | M3-GATE（**FULL PASS**）；M2-GATE 后可并行文字/分享路径 | **M4-GATE** | 双端分享/OCR → 候选队列；入库门控不变 |
| 5 | [M5-signature-memory-experiences](./M5-signature-memory-experiences.md) | `signature-memory` | M4-GATE | **M5-GATE** | 用户模式自适应 MemoryWeather/Replay/ReverseQuestion |
| 6 | [M6-release-observability-and-mobile-e2e](./M6-release-observability-and-mobile-e2e.md) | `dual-device-qa` | M5-GATE | **M6-GATE** | 双端真机 QA + ring buffer/E2E；Sentry optional |
| 7 | [M7-sync-backup-and-long-term-trust](./M7-sync-backup-and-long-term-trust.md) | `sync-backup` | M6-GATE | **M7-GATE**（= M7A + M7B） | M7A 换机/备份 → M7B SyncProvider |

## 执行顺序（推荐）

```
M0（阻塞一切；含文档修订清单；apps/mobile 与 packages/core 目录骨架已存在）
  → M1（ColdStart + AdaptiveRadar 主路径；Expo Go 或 Dev Client；双端 smoke）
  → M2（MigrationGate + expo-sqlite；profile/mode 落盘；杀进程可恢复）
  → M3（须 Dev Client / native build；token exchange ADR；双端语音矩阵）
  → M4（Android intent + iOS Share Extension；**M2 后可并行文字/分享捕获设计与实现**；M4-GATE FULL PASS 仍须 M3-GATE）
  → M5（招牌体验；用户模式自适应；性能阈值见 M5/M2）
  → M6（双端真机 QA；**ring buffer/diagnostic export + 移动 E2E 硬需**；Sentry/EAS/TestFlight/Play optional）
  → M7A（换机/加密备份 PASS）→ M7B（SyncProvider/冲突 PASS）→ M7-GATE
```

## 当前目录骨架

已创建两个最小、可追踪的目录骨架：

| 目录 | 当前状态 | 后续 M0-GATE 仍需补齐 |
|------|----------|------------------------|
| [`apps/mobile`](../../apps/mobile/README.md) | 仅 README；说明 M1+ Expo App 落点与禁止事项 | package manifest、tsconfig、Expo 配置、测试入口、workspace 接入 |
| [`packages/core`](../../packages/core/README.md) | 仅 README；说明 M0+ 纯 TypeScript core 边界 | package manifest、tsconfig、public `index.ts`、测试护栏、workspace 接入 |

当前骨架 **不是可运行 package**：不得因此跳过 `pnpm-workspace.yaml`、package manifests、tsconfig、ESLint / dependency-cruiser 或等价边界测试护栏。

## 验收门总览

| 门 | 通过条件（摘要） | 失败时 |
|----|------------------|--------|
| **M0-GATE** | `pnpm check` 绿；**真实** workspace + package manifests + tsconfig；`expo start` 占位屏；边界护栏脚本绿；`EXECUTION_STATE.json` + `pnpm mobile:gate`；ADR；文档修订清单 | 禁止 M1 UI 开发 |
| **M1-GATE** | 无 API key 60s 内完成**个性化**闭环（演示可走 **ingest 或 capture 任一主路径**；**gate 证据须 ingest + capture 双闭环各 ≥1 条**，且 **capture 落点存在**）；≥3 条冷启动 fixture（含混合模式）；AdaptiveRadar；ProfileReview + correction history；DegradedMode 可见；双端 smoke | 禁止 M2 持久化 |
| **M2-GATE** | MigrationGate；profile/mode/**correction history** 持久化；杀进程恢复；**iOS excluded-from-backup / Android 排除明文 DB** | 禁止 M3 真实语音（M4 文字/分享可并行） |
| **M3-GATE** | barge-in；三意图一致；双端语音矩阵；token 不进包 | M4 FULL PASS 仍须 M3；禁止语音 M4 bypass |
| **M4-GATE** | 双端分享分别验收；仅候选；SSRF；**FULL PASS 须 M3-GATE PASS** | 禁止 M5 |
| **M5-GATE** | 招牌输出可追溯到 evidence；用户模式自适应；1 万节点不全量渲染 | 禁止 M6 QA gate |
| **M6-GATE** | ≥1 iOS + ≥1 Android **dev/preview build** **M0–M5 主路径** smoke；**CI 移动 E2E（硬需）**；**本地 ring buffer/diagnostic export（硬需）**；**Sentry optional**（缺配置不 FAIL gate）；**不含** M7 同步/备份；EAS/TestFlight/Play **optional**；**缺商店账号不 FAIL** | 禁止 M7 同步 |
| **M7A-GATE** | 换机导出/导入；加密备份；**correction history** 可恢复 | 禁止 M7B 前声称 M7-GATE PASS |
| **M7B-GATE** | Sync 不 bypass 入库；冲突 UI；sync 保留 correction history | — |
| **M7-GATE** | **M7A + M7B 均 PASS**；附录 **M0–M6 + M7A + M7B** 全部 `*-GATE-report.md` 均为 PASS；**= 阶段 0–7 完整功能验收** | 产品化完整验收 |

**完整功能验收**：**M7-GATE PASS** = 阶段 0–7 全部交付（= **不公开上线的完整成品**）；附录 **M0–M6 + M7A + M7B** 全部 gate 报告均为 PASS。**M6-GATE** = 双端真机 M0–M5 主体能力 QA + **ring buffer + 移动 E2E（硬需）** + **Sentry optional**；**不含** M7 同步/备份；**不含**公开商店发布硬要求。

## 缺资源 / 验收概览

| 缺失 | M0–M5 | M6 | M7 |
|------|-------|-----|-----|
| API key | OK mock + DegradedMode | OK | OK |
| 真机（单端） | 模拟器可；M1 起建议双端 | **双端各 ≥1 硬需** | 换机 fixture 需双实例 |
| Apple/Google 开发者账号 | 不阻塞 | **optional**（release track）；**不 FAIL gate** | 云备份 optional |
| EAS / TestFlight / Play | 不阻塞 | **optional release track**（**不 FAIL M6-GATE**） | 不阻塞 |
| 移动 E2E（Maestro/Detox CI） | M2 起本地 | **M6-GATE 硬需** | 不阻塞 |
| Token exchange 服务 | M3 mock + ADR | staging 可选 | N/A |
| Mac/Xcode | 非必须至 M3 | iOS 深调需 | 可选 |

## 测试落点（全系列约定）

| 层 | 路径 / 工具 | 覆盖阶段 |
|----|-------------|----------|
| Core 单元/不变量 | `packages/core/**/*.test.ts`（Vitest） | M0–M7 |
| Storage 行为夹具 | 对齐 `src/invariants/testStorage.ts` | M2+ |
| Mobile 组件 | `apps/mobile/**/*.test.tsx`（RN Testing Library） | M1+ |
| Mobile E2E | Maestro `apps/mobile/e2e/` 或 Detox | M2 起本地；M6 进 CI |
| Eval harness | `docs/evals/` + 冷启动分流/语音意图/入库质量 fixture | M1/M3/M5 |
| 性能冒烟 | 首页 30–80 可见节点；Replay 增量读 history | M1/M5 |
| 双端 smoke | Android + iOS dev build 主路径 | M1 起；M6 强化 |

## Expo 运行时边界（执行期）

| 阶段 | 推荐运行时 | 原因 |
|------|------------|------|
| M0–M1 | **Expo Go** 或 **Expo Dev Client** | 无自定义原生模块；快速迭代 UI |
| M2 | **Dev Client**（推荐） | `expo-sqlite` 原生依赖；MigrationGate 需稳定 DB |
| M3–M4 | **Dev Client / native build**（必须） | 原生语音 WS Header、Share Extension、麦克风 |
| M5 | Dev Client / native build | Skia/Reanimated 深调；真机性能 |
| M6 | **Dev Client / native build**（双端真机） | 双端 QA gate；**ring buffer + E2E 硬需**；Sentry/EAS/TestFlight **optional** |
| M7 | Dev Client / native build | 换机/备份/同步验收 |

## M0 必须修订的文档冲突项

> **M0 前置提醒（读者防走偏）**：除下表修订外，M0 **必须**在 `PRODUCT.md`、`docs/ARCHITECTURE.md`、`AGENTS.md`、`docs/handbook/PROJECT_HANDBOOK.md` **顶部**加醒目标注：**移动 App-only / User Evolution-first 以 `docs/MOBILE_PRODUCT_PLAN.md` + `specs/mobile-app/` 为准**。本 README 与 M 系列 spec 为移动执行权威；legacy 文档在未修订前易误导读者。

实施 M0 代码前，须修订或加注以下与 **App-only** 冲突的文档：

| 文档 | 冲突点 | M0 动作 |
|------|--------|---------|
| [`AGENTS.md`](../../AGENTS.md) | Tech stack 写死 Tauri 2 + Web 双目标；无 `apps/mobile` / `packages/core` | **顶部醒目标注** + 增补 App-only 主路径与 monorepo 说明；保留 legacy web 为 dev surface |
| [`PRODUCT.md`](../../PRODUCT.md) | 桌面/Web 沉浸式伴侣为主叙述；AI News-first 叙述 | **顶部醒目标注** + 增补 User Evolution-first、移动端 LivingBrainHome 为产品第一入口 |
| [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) | 默认体验以 Web companion 为中心 | **顶部醒目标注** + 增补 mobile 四层架构与 MigrationGate |
| [`docs/handbook/PROJECT_HANDBOOK.md`](../../docs/handbook/PROJECT_HANDBOOK.md) | 目录地图无 `apps/mobile` | **顶部醒目标注** + 增补 monorepo 地图与 M 系列指针 |
| [`docs/KNOWLEDGE_OS_VISION.md`](../../docs/KNOWLEDGE_OS_VISION.md) | §「桌面/Web 第一入口」；Radar/Briefing-first 叙述；KOS 蓝图未对齐 App-only / User Evolution-first | **修订**（对齐 [`MOBILE_PRODUCT_PLAN.md`](../../docs/MOBILE_PRODUCT_PLAN.md) §6 阶段 0）：mobile 为第一产品入口；桌面/Web 降为 legacy dev surface；AdaptiveRadar 非固定 AI 简报；storage 三端（web / tauri / **mobile**） |
| Storage 三端规则 | 仅 web / tauri | 增补 **mobile**（`expo-sqlite`）第三轨 |
| 产品定位 | AI News/Radar-first | 增补 **User Evolution-first**；AdaptiveRadar 非默认 AI 简报 |
| 发布策略 | M6 等同公开上线 | 增补 **not-store-release-first**；M6 = 双端 QA gate |

## `packages/core` public API 边界（M0 起强制执行）

**允许出现在 `packages/core` public export：**

- 纯 TypeScript：domain 类型、conversation FSM、ingest/auto-curate use-case、**`UserModeProfile`** routing、**`AdaptiveSignal`** 契约、AdaptiveRadar 逻辑、provider **接口**、storage **端口**类型、跨平台 `readAppEnv()` 抽象

**禁止泄漏进 `packages/core`：**

- React / React Native / JSX
- Zustand store 或 `useXxxStore.getState()` 直读
- `import.meta.env` / `VITE_*` / `process.env` 未经 `readAppEnv()` 抽象
- DOM / `window` / `document` / Web Audio / `navigator.mediaDevices`
- Showcase / `?showcase=1` 等 **runtime query flag** 判断
- `react-force-graph` 或任何 UI 渲染库

违规 = **M0-GATE FAIL**；CI 可加 `dependency-cruiser` 或 ESLint `no-restricted-imports` 护栏。

## 并行性速记

| 可并行 | 前提 |
|--------|------|
| M0 文档修订 与 monorepo 脚手架 | 修订清单须 M0-GATE 前合并 |
| M1 UI 与 M0 core wave 2 迁移 | M0-GATE 已通过；core API 稳定 |
| M2 storage adapter 与 M1 DegradedMode 收尾 | M1 主路径可 mock 跑通 |
| **M4 文字/分享捕获**（设计/非语音实现）与 M3 语音 | **M2-GATE PASS 后**可并行；**禁止** M4-GATE FULL PASS 或语音相关 M4 能力 bypass M3 |
| M6 本地 ring buffer/E2E 与 M5 招牌体验收尾 | ring buffer + E2E 为 gate 硬需；功能不依赖商店发布渠道 |
| M6 optional Sentry/EAS 与 M6 QA gate | optional track 不阻塞 gate PASS |
| M7A 备份实现与 M6 QA | M6-GATE 前仅设计/接口；M7A 先于 M7B |
| M7B 同步设计与 M7A | M7A-GATE PASS 后实施 M7B |

## 验证命令约定

```bash
# 全仓库（M0 起须保持绿）
pnpm check
# Core only
pnpm --filter @my-brain/core test
# Mobile unit（M1 起）
pnpm --filter @my-brain/mobile test
# Mobile E2E（M2 本地；M6 CI）
maestro test apps/mobile/e2e/
# 阶段 gate（M0 起必须存在）
pnpm mobile:gate M0
```

各 M spec 中声明的测试文件路径在验收时必须 **真实存在** 且包含对应断言；`passWithNoTests: false` 或等价约束。

**全系列 Gate 流程**（M0–M7，详见 [`GATE_VERIFIER_SPEC.md`](./GATE_VERIFIER_SPEC.md)）：

1. 子 agent 完成阶段交付 → 父 agent 撰写 `specs/mobile-app/reports/M{n}-GATE-report.md`（模板见 [`EXECUTION_GUARDRAILS.md`](./EXECUTION_GUARDRAILS.md) §8）。
2. 运行 `pnpm mobile:gate M{n}`（M7 为 `M7A`/`M7B`/聚合 `M7`）；verifier 读取 `EXECUTION_STATE.json`、当前/上一阶段报告、阶段 spec 与禁止项。
3. 仅当 verifier 返回 **PASS** 且父 agent 签核后，方可更新 `EXECUTION_STATE.json` 并进入下一阶段。

**Gate 证据格式（harness engineering，非新功能）**：每份 `M{n}-GATE-report.md` 须包含可机器/人工复核的结构化证据——至少 **`status`（判定）**、**`summary`（摘要）**、**`artifacts`（命令/测试/截图/录屏路径）**、**`next_actions`（推进或阻塞项）**；与 [`EXECUTION_GUARDRAILS.md`](./EXECUTION_GUARDRAILS.md) §8 模板等价。失败或 `NEEDS_DEVICE_EVIDENCE` 路径须附 **root cause hint**、**安全重试步骤**与 **停止条件**（何时 `HARD_STOP`、何时停在当前阶段补证据），便于无人干预流水线恢复。

**Gate verdict 扩展**：`NEEDS_DEVICE_EVIDENCE` — 机器检查通过但缺真机/人工证据（M3 barge-in、M4 分享/intent、M6 双端 smoke）；**非 FAIL 非 PASS**，停在当前阶段等待设备证据。

## Skill 使用建议

| 阶段 | 规划期 | 落地后 |
|------|--------|--------|
| **执行前** | 读 [`EXECUTION_GUARDRAILS.md`](./EXECUTION_GUARDRAILS.md) | 父 agent 每阶段签核 `reports/M{n}-GATE-report.md` |
| M0 | `/plan-eng-review`（已完成，见产品计划 §17） | `review` 查 core 边界 |
| M1 | `/plan-design-review` LivingBrainHome + ColdStart | `design-review` + `qa` |
| M2 | — | storage 夹具 + MigrationGate 测试 |
| M3 | token exchange + RN 语音 ADR | eval harness + 双端真机 |
| M4 | 安全边界（SSRF） | 双端分享 E2E |
| M5 | 动效与性能 | 增量 Replay + 用户模式 fixture |
| M6 | — | 双端 smoke + Maestro CI + ring buffer；Sentry optional |
| M7 | 冲突策略评审 | sync fixture + 门控测试 |
