# Mobile M0–M7 无人干预执行护栏

> **用途**：供 **GPT-5.5 父 agent** 在同一 Cursor 窗口中，按顺序监督 **composer2.5 子 agent** 从 M0 执行到 M7；用户不人工干预。  
> **权威来源**：[`docs/MOBILE_PRODUCT_PLAN.md`](../../docs/MOBILE_PRODUCT_PLAN.md) · 各 [`M*.md`](./) · [`README.md`](./README.md)  
> **开始任何 M 阶段代码前**：父 agent 与子 agent **必须先读本文件**。
> **执行控制面**：[`EXECUTION_STATE.schema.json`](./EXECUTION_STATE.schema.json) · [`STAGE_PROMPT_TEMPLATE.md`](./STAGE_PROMPT_TEMPLATE.md) · [`GATE_VERIFIER_SPEC.md`](./GATE_VERIFIER_SPEC.md) · [`reports/`](./reports/)

---

## 1. 总原则

| 原则 | 含义 |
|------|------|
| **用户不干预** | 执行期不向用户索要选择；缺资源时按 §6 降级或 hard stop，并产出可诊断报告 |
| **父 agent 监督** | 每阶段 enter 前重读 plan + 对应 M spec + 本文件；exit 前验收证据，**不得跳 gate** |
| **子 agent 实施** | 一次只做一个 M 阶段；不得「顺手做到 M7」；不得静默后台跑过 gate |
| **不得跳 gate** | `M(n)-GATE` 未 PASS → 禁止进入 `M(n+1)` enter 条件 |
| **状态落盘** | M0 起创建 `EXECUTION_STATE.json`；父 agent 只允许执行 `allowedNextAction` 指定的当前阶段 |
| **机器验 gate** | M0 起接入 `pnpm mobile:gate M0`…`M6`、`M7A`、`M7B`、聚合 `M7` 或等价 verifier；报告、状态、命令三者 PASS 才能推进 |
| **mock 可见** | mock/degraded 必须在 Settings + 可选横幅对用户可见；禁止 silent live |
| **骨架 ≠ 完成** | [`apps/mobile`](../../apps/mobile/README.md) / [`packages/core`](../../packages/core/README.md) 现有 README 骨架 **不等于** M0-GATE PASS |
| **M6 ≠ 完整验收** | M6-GATE = 双端真机 **M0–M5 主体能力 QA** + 可观测性 + E2E；**不含** M7 同步/备份；**M7-GATE** = 阶段 0–7 完整功能验收（= 不公开上线的完整成品） |
| **M6 ≠ 公开上线** | TestFlight/Play/EAS Submit 为 optional release track；缺商店账号 **不 FAIL** M6-GATE |
| **失败可诊断** | 失败时停在当前阶段、保留日志/测试输出/commit diff；禁止带病跨阶段 |

---

## 2. 角色分工

### 2.1 GPT-5.5 父 agent（监督 / 验收）

- 阶段切换前：**重读** `MOBILE_PRODUCT_PLAN.md` 对应 §、目标 M spec、本文件 §3 状态机
- 阶段切换前：读取 `EXECUTION_STATE.json`，确认 `allowedNextAction` 匹配当前阶段（`run_M{n}_only`；M7 子门为 `run_M7A_only` / `run_M7B_only`）
- 按 [`STAGE_PROMPT_TEMPLATE.md`](./STAGE_PROMPT_TEMPLATE.md) 下发 **单阶段任务包**（enter 条件 + 禁止事项 + 必须产出的测试/文件）
- 子 agent 完成后：按 §8 模板审查 **阶段验收报告**；运行 §7 命令矩阵中该阶段 **必须真实存在** 的检查；M0 起必须运行 [`GATE_VERIFIER_SPEC.md`](./GATE_VERIFIER_SPEC.md) 定义的 verifier
- **PASS** → 写入并签核 `specs/mobile-app/reports/M{n}-GATE-report.md` → 更新 `EXECUTION_STATE.json` → 许可下一阶段
- **FAIL** → 同阶段修复循环；**禁止**开下一阶段 todo

### 2.2 composer2.5 子 agent（实施 / 写作）

- 只实现当前 M spec **范围内** 交付；不扩 scope、不改 package 依赖除非 spec 明确要求
- 每完成一个 logical chunk：跑相关测试；失败则修复，**不** `--no-verify` 提交
- 阶段结束前：产出 §8 验收报告草稿 + 测试日志 + 关键截图/录屏路径
- 必须在返回中声明是否触碰 `M{n+1}+` 范围；触碰即父 agent 判定越界
- **禁止**：一次性实现 M0–M7；禁止跳过 MigrationGate（M2+）；禁止在 M2 前挂 LivingBrainHome 读写 SQLite

### 2.3 测试 / 验收证据

- **机器证据**：`pnpm check`、阶段专项 test、E2E yaml、lint/boundary 脚本输出（完整 stderr）
- **人工/半自动证据**：60s 个性化主路径、真机 barge-in、双端 dev/preview build smoke — 须有 **时间戳 + 设备型号 + 命令**
- **真机证据 gate**：缺真机/人工证据时 verdict = **`NEEDS_DEVICE_EVIDENCE`**（非 FAIL、非 PASS）；停在当前阶段等待设备证据（M3/M4/M6）
- **文档证据**：ADR 路径、public API 清单、修订 PR 链接或 waiver 记录

### 2.4 失败处理

```text
FAIL detected
  → 记录：命令、exit code、末 50 行日志、相关 diff
  → 分类：§5（可降级 vs hard stop）
  → 可降级：显式 DegradedMode + 验收报告标注 DEGRADED（**不得冒充 FULL PASS**；**不得解锁 M(n+1)**）
  → NEEDS_DEVICE_EVIDENCE：机器检查通过但缺真机证据；**不得解锁 M(n+1)**；等待设备证据后复验
  → hard stop：停止流水线；父 agent 输出 blocker 报告；不进入下一阶段
```

---

## 3. M0→M7 状态机

```text
                    ┌──────────────────────────────────────────────┐
                    │ START：读 plan + README + GUARDRAILS + STATE │
                    └───────────────────────┬──────────────────────┘
                                         v
┌──────────┐  M0-GATE   ┌──────────┐  M1-GATE   ┌──────────┐  M2-GATE   ┌──────────┐
│    M0    │───────────>│    M1    │───────────>│    M2    │───────────>│    M3    │
│ foundation│   PASS    │ local UI │   PASS    │ sqlite   │   PASS    │  voice   │
└──────────┘            └──────────┘            └ MigrationGate        └──────────┘
     │ FAIL                  │ FAIL                  │ FAIL                  │ FAIL
     v                       v                       v                       v
 [fix M0]               [fix M1]               [fix M2]               [fix M3]
 STOP                   STOP                   STOP                   STOP
  M3-GATE PASS ──> M4 (capture) ──M4-GATE──> M5 (signature) ──M5-GATE──> M6 (dual-device QA)
                                                                        │
                                        M6-GATE（≠ 完整验收 / ≠ 公开上线）   v
                                                                   M7A (backup)
                                                                        │
                                                                  M7A-GATE
                                                                        v
                                                                   M7B (sync)
                                                                        │
                                                                  M7B-GATE
                                                                        v
                                                              M7-GATE（聚合）
                                                                        │
                                                                   complete
                                                              （完整功能验收）
```

### 3.1 各阶段 enter / exit / stop

| 阶段 | Enter 条件 | Exit gate（必须全部满足） | Rollback / Stop |
|------|------------|---------------------------|-----------------|
| **M0** | 无（DoR：必读 guardrails + gate spec） | **M0-GATE**：`pnpm check` 绿；workspace + manifests + core/mobile 可 typecheck；`expo start` 占位屏；core 边界护栏；ADR；文档修订清单 100% 登记或已合并（含 **`docs/KNOWLEDGE_OS_VISION.md`**） | 循环依赖 / check 红 / 缺 KNOWLEDGE_OS 修订且无 waiver → **FAIL**；**禁止 M1** |
| **M1** | M0-GATE PASS | **M1-GATE**：无 key 60s **个性化**闭环；**ingest + capture 双 eval 各 ≥1**（**禁止 waiver**）；≥3 冷启动 fixture（含混合模式）；AdaptiveRadar；ProfileReview v0 + correction history；capture v0 UI/store/FSM 落点；DegradedMode 可见；双端 smoke | 缺任一 eval 记录 → **FAIL**；**禁止 M2** |
| **M2** | M1-GATE PASS | **M2-GATE**：MigrationGate 通过才挂 LBH；Settings **Provider 状态面板**；ring buffer **白名单**；**M1 错误注册表 SQLite 回归**；**iOS excluded-from-backup 证据**；**`storage_degraded` 分层**；杀进程恢复；persistWarning UI | migration 失败 → MigrationScreen；**禁止 M3 真实语音** |
| **M3** | M2-GATE PASS | **M3-GATE**：barge-in；三意图一致；**仓内 scan + bundle artifact grep** 无长期密钥（入包 → **HARD_STOP**）；**`degradedVoiceEvidence` / Settings `voice_disconnected`**；ADR 落盘 | 无 Dev Client → **HARD_STOP** 或 **NEEDS_DEVICE_EVIDENCE**；长期密钥入包 → **HARD_STOP**；**禁止 M4 FULL PASS** |
| **M4** | **M4 文字/分享路径**：M2-GATE PASS 后可并行设计/实现；**M4-GATE FULL PASS** 须 **M3-GATE PASS** | **M4-GATE**：分享仅 provisional；**§2.1 SSRF allowlist fixture 全集**；**`provisionalQueueFsm.test.ts`**；非 SSRF 错误路径 root cause / safe retry / stop condition；确认前无 permanent | 缺 SSRF/FSM 测试 → **FAIL**；M4 FULL PASS 绕过 M3 → **HARD_STOP**；native build 不可用 → **NEEDS_DEVICE_EVIDENCE** |
| **M5** | M4-GATE PASS | **M5-GATE**：**5 种 UserMode** fixture；**Weather/Replay/Question 三类 evidence 分测**；`replayColdStart` + **`m5-replay-perf.md`**；万节点 fixture；**default-on flags** | 缺 evidence 分测或 perf 伪 PASS → **FAIL/HARD_STOP**；**禁止 M6** |
| **M6** | M5-GATE PASS | **M6-GATE**：双端 smoke 覆盖 **语音闭环、捕获、记忆体验、本地诊断**（M0–M5 主路径）；**CI E2E 硬需**；ring buffer/diagnostic export 硬需；**Sentry optional**；**不含** M7 同步/备份 | 缺双端 smoke → **NEEDS_DEVICE_EVIDENCE**；E2E CI 红 → **FAIL**；无商店账号 → **optional BLOCKED**，**不 FAIL gate** |
| **M7A** | M6-GATE PASS；`currentPhase=M7A`；`allowedNextAction=run_M7A_only` | **M7A-GATE**：换机/加密备份 + **§2.1.1 snapshot 最小实体集** + correction history | 未 PASS → **禁止 M7B** |
| **M7B** | M7A-GATE PASS；`currentPhase=M7B`；`allowedNextAction=run_M7B_only` | **M7B-GATE**：sync 门控/冲突；**信任优先级**；**local-first** 不变量；保留 correction history | 冲突 silent merge / ingest bypass → **FAIL/HARD_STOP**；未 PASS → **禁止 complete** |
| **M7-GATE** | M7B-GATE PASS | **M7-GATE** = M7A + M7B + **M0–M6 + M7A + M7B 共 9 份报告链 PASS**；写入 `reports.M7`；`currentPhase=complete` | 聚合未 PASS / 附录缺链 → **FAIL** |

---

## 4. Definition of Ready / Done / 证据清单

### M0 — App-only foundation

| | 内容 |
|---|------|
| **DoR** | **M0 代码或脚手架前**父 agent 与子 agent **必须**全文阅读 [`EXECUTION_GUARDRAILS.md`](./EXECUTION_GUARDRAILS.md) + [`GATE_VERIFIER_SPEC.md`](./GATE_VERIFIER_SPEC.md)；子 agent 返回须声明已读；缺任一文件 → **HARD_STOP**；已读 plan §0、§6 阶段 0、§17；确认 skeleton ≠ 完成（§11 P0-1） |
| **DoD** | 见 [`M0-app-only-foundation.md`](./M0-app-only-foundation.md) §8 全部勾选 |
| **必须证据** | `pnpm check` 全绿日志；`packages/core` `tsc --noEmit`；dependency-cruiser/eslint 无禁止 import；`expo start` 截图；ADR 文件路径；**文档修订登记表 100%**（含 **`docs/KNOWLEDGE_OS_VISION.md`** — 既非 `merged` 亦非父 agent 签核 `waiver` → **FAIL**） |
| **禁止** | 把「仅有 README 的目录」算作 monorepo 完成；未读 guardrails/gate spec 即写代码 |
| **控制面** | 创建 `EXECUTION_STATE.json`、`tools/mobile-execution/verify-stage.ts`、`pnpm mobile:gate M{n}`、`reports/`；见 [`GATE_VERIFIER_SPEC.md`](./GATE_VERIFIER_SPEC.md) |
| **判定** | 缺 guardrails/gate spec → **HARD_STOP**；文档修订缺 KNOWLEDGE_OS 且无 waiver → **FAIL** |

### M1 — Local product foundation

| | 内容 |
|---|------|
| **DoR** | M0 报告 PASS；core public API 清单冻结；ingest 去耦设计已落地或 PR 中 |
| **DoD** | 60s **个性化**闭环：**ingest loop + capture loop 双 eval 各 ≥1**（`docs/evals/mobile-m1-ingest-loop.md` + `mobile-m1-capture-loop.md`）；**禁止 waiver**；ColdStart + AdaptiveRadar + **`UserModeProfile`** + **`AdaptiveSignal`**；ProfileReview + **correction history / suppression**；**capture v0 落点**：`QuickCaptureFab` + `ProvisionalQueueSheet` + `provisionalStore` + `packages/core/provisional/*` + FSM `provisional_pending`；DegradedMode；MemoryWeather v0；双端 smoke |
| **必须证据** | `AdaptiveRadar.test.tsx`、`ProfileReview.test.tsx`；`packages/core/provisional/queue.test.ts`；`docs/evals/cold-start-fixtures.json` ≥3 条（含混合模式）；**双 eval 记录**；双端 smoke 记录 |
| **禁止** | 固定 AI 简报验收；把 M2 MigrationGate 提前塞进 M1；禁止 silent `legacy_radar`；缺 ingest **或** capture eval → **FAIL**（**不可 waiver**） |
| **判定** | 缺任一 eval 文件 → **`pnpm mobile:gate M1` = FAIL** |

### M2 — Local storage

| | 内容 |
|---|------|
| **DoR** | M1 PASS；Dev Client 可用（`expo-sqlite`） |
| **DoD** | MigrationGate 硬门；Settings **Provider 状态面板**（mock/degraded/live/connected/disconnected，testId 可断言）；**ring buffer 白名单**（`ringBufferWhitelist.test.ts` + `export.test.ts`）；**M1 错误注册表 SQLite 回归**（`m1RegistryOnSqlite.test.ts`：`IngestProposalError` pending 不丢、`ProviderConfigError` UI 标识）；**iOS excluded-from-backup 结构化证据**（§8.1）；**`storage_degraded` 与 `StorageInitError` 分层**可见；三端 storage 夹具 mobile 轨 PASS；**correction history** 持久化；Android 排除明文 DB |
| **必须证据** | `MigrationGate.test.tsx`；`Settings.test.tsx`（Provider 面板）；`m1RegistryOnSqlite.test.ts`；`ringBufferWhitelist.test.ts`；Maestro `persistence.yaml`；`persistWarning` 截图；iOS backup 证据（配置 + 审查清单） |
| **禁止** | 先挂 LBH 再后台 migrate；内存图谱冒充持久化；ring buffer 含 node 正文/transcript |
| **判定** | Provider 面板缺失或 M1 错误 SQLite 回归失败 → **FAIL**；`storage_degraded` 与全库 init 失败未分层 → **FAIL** |

### M3 — Realtime voice

| | 内容 |
|---|------|
| **DoR** | M2 PASS；token exchange + RN 语音 **ADR** 已落盘；Dev Client/native build |
| **DoD** | barge-in；FSM 一致；**仓内 `pnpm run scan:secrets` + dev/preview build bundle artifact grep** 无长期密钥；**`degradedVoiceEvidence`**（≥2 场景，含 Settings **`voice_disconnected`**）；ADR 落盘 |
| **必须证据** | `ingestIntent.test.ts`；`docs/evals/m3-voice-degraded.md`；真机或模拟器 barge-in 录屏；`specs/mobile-app/reports/artifacts/M3-scan-secrets.log` + `M3-bundle-secret-grep.log`；ADR 路径 |
| **降级** | TokenExchangeError → 文字 + `voice_disconnected` + mock transport；**仅在 M3 内**继续修复与验证；**不得 M4-GATE FULL PASS**；**M3-GATE FULL PASS** 仍须满足 [`M3-realtime-voice-and-token-exchange.md`](./M3-realtime-voice-and-token-exchange.md) §8 |
| **NEEDS_DEVICE_EVIDENCE** | barge-in 缺真机证据 → 非 FAIL 非 PASS |
| **HARD_STOP** | 长期密钥入仓或入包；仅 Expo Go、无 native 模块 → 不得声称 M3-GATE PASS；报告 PASS 但 scan/bundle grep 失败 → 伪通过 **HARD_STOP** |

### M4 — Quick capture

| | 内容 |
|---|------|
| **DoR** | **文字/分享路径**：M2-GATE PASS 后可开始；**FULL PASS**：M3-GATE PASS；Share Extension / intent 原生工程就绪 |
| **DoD** | provisional only；**§2.1 SSRF allowlist fixture 全集** PASS（scheme/port/IP/DNS/redirect/timeout）；**`provisionalQueueFsm.test.ts`**（core + mobile）复用 `ConversationConductor`；**非 SSRF 错误路径**须 root cause hint / safe retry / stop condition（对齐 M4 §6.1 表）；语音笔记须 M3 |
| **必须证据** | `ssrf.test.ts` + `urlFetchGuard.test.ts`（**§2.1 全 fixture ID**）；`provisionalQueueFsm.test.ts`；`ingestGate.test.ts`（share/OCR bypass 否定）；E2E share yaml；杀进程后候选仍在；Extension 无密钥审查 |
| **禁止** | M4-GATE FULL PASS 绕过 M3（→ **HARD_STOP**）；高置信自动 permanent；内网 URL；缺 SSRF/FSM 测试 → **FAIL**（**禁止 waiver**） |
| **NEEDS_DEVICE_EVIDENCE** | Android intent / iOS Share Extension 真机验收缺证据 |

### M5 — Signature memory

| | 内容 |
|---|------|
| **DoR** | M4 PASS；M2 learning trace 可靠 |
| **DoD** | **5 种 primary UserMode** 各 ≥1 fixture（可另含混合模式）；**MemoryWeather / MemoryReplay / ReverseQuestion 三类 evidence 分测**（`weatherEvidence.test.ts`、`replayEvidence.test.ts`、`reverseQuestionEvidence.test.ts`）；`replayColdStart.test.ts` + 真机 **`docs/evals/m5-replay-perf.md`**（P50 <500ms）；**万节点 fixture** 不全量渲染；**Feature Flags default-on** 下全量验收 |
| **必须证据** | `replayIncremental.test.ts`；`replayColdStart.test.ts`；`m5-replay-perf.md`；`m5-evidence.sqlite` + `m5-modes/manifest.json` + `m5-signature-fixtures.json`；`nodeBudget.test.ts` |
| **禁止** | `SELECT * FROM nodes` 全表 Replay；仅 Weather 有 evidence 测试；flag 缩水 M5 范围；缺 perf 真机 artifact 却声称 PASS → **HARD_STOP** |
| **判定** | 五模式或三类 evidence 任一缺失 → **FAIL**；`replayColdStart.test.ts` 失败 → **FAIL** |

### M6 — Dual-device QA & Observability

| | 内容 |
|---|------|
| **DoR** | M5 PASS；双端 dev/preview build 可产出 |
| **DoD** | 双端真机 **M0–M5 主体能力** smoke，**显式含**：**M3 语音闭环/三意图**、**M4 分享捕获候选**、**M5 MemoryWeather/MemoryReplay 证据体验**、**M2 本地 ring buffer/diagnostic export**；**CI 移动 E2E 硬需**（`.github/workflows/mobile-e2e.yml` 绿）；**Sentry/Analytics optional**（默认 off/mock，未配置 **不 FAIL gate**） |
| **必须证据** | iOS + Android smoke 结构化记录（`docs/evals/m6-*-smoke.md`，§8.1.1 字段）；`mobile-e2e.yml` 绿；`whitelist.test.ts`；`export.test.ts`；诊断导出无敏感正文 |
| **optional** | TestFlight/Play/EAS Submit（有账号时）；无账号标 **BLOCKED**，**不 FAIL gate** |
| **NEEDS_DEVICE_EVIDENCE** | 双端 smoke 缺 iOS **或** Android 真机证据 |
| **禁止** | 用 Expo Go 冒充 M6 验收；声称 M6 = 完整产品验收；声称 M6 = 公开商店上线；因缺账号 fake PASS；将 Sentry 设为 gate 硬需 |
| **判定** | E2E CI 红 → **FAIL**；仅单端真机 → **NEEDS_DEVICE_EVIDENCE** |

### M7 — Sync & trust

| | 内容 |
|---|------|
| **DoR** | M6 PASS；**附带 M0–M6 各 `M{n}-GATE-report.md` 且均为 PASS** |
| **DoD** | **M7A**：换机/加密备份 + **§2.1.1 snapshot 最小实体集**（graph snapshot + history + profile + correction history + provisional + learning trace + WorldItem + adaptive radar state 等）；**M7B**：Sync 门控/冲突；**信任优先级**：**用户手动纠偏 > 行为信号 > LLM 推断**；**local-first 不变量**：sync **不 bypass** 入库门控、delete=archive、无 silent create；**M7-GATE** = M7A + M7B + **附录报告链 M0–M6 + M7A + M7B 共 9 份 PASS** |
| **必须证据** | `ingestGate.test.ts`；`two-device/` fixture；`sync-conflict.yaml`；加密备份 ADR；M7A `backup_manifest_version` + `included_entities[]`；合并错误 **root cause / safe retry / stop condition**（M7 §6.1） |
| **禁止** | sync silent create；hard delete；M7B 在 M7A 前 PASS；恶意 snapshot → **HARD_STOP** |
| **判定** | 附录任缺 PASS 报告 → **FAIL**；ingest gate bypass → **HARD_STOP** |

---

## 5. 阶段失败策略

| 类型 | 示例 | 策略 |
|------|------|------|
| **Hard stop** | `pnpm check` 红；MigrationGate 绕过；**长期密钥入仓/入包**（M3 bundle grep）；M4 FULL PASS 绕过 M3；M6 E2E CI 伪造 PASS；M7 ingest gate bypass；恶意 snapshot | 停止；出 blocker 报告；不进入下一阶段 |
| **Optional blocked** | M6 无 Apple/Google 账号 / EAS | optional release track 标 BLOCKED；**M6-GATE 仍可 PASS**（若 §8.1 硬需满足） |
| **Degraded（同阶段继续，非 gate 冒充）** | 无 LLM key（M1 mock）；Radar live 失败（fixture）；TokenExchange 暂不可用（M3 文字/mock 路径） | 可继续 **当前 M 阶段** 修复与验证；验收报告可标 **DEGRADED**；**不得进入 M(n+1)**；**M(n)-GATE FULL PASS** 仍须满足对应 spec §8 |
| **NEEDS_DEVICE_EVIDENCE** | M3 barge-in、M4 分享/intent、M6 双端 smoke 缺真机证据 | **非 FAIL 非 PASS**；停在当前阶段；补设备证据后复验；**不得解锁 M(n+1)** |
| **FAIL（不可 waiver）** | M1 缺 ingest **或** capture eval；M4 缺 SSRF 全集 / `provisionalQueueFsm`；M0 缺 KNOWLEDGE_OS 修订且无 waiver | 同阶段修复循环；**禁止** waiver 冒充 PASS |
| **同阶段修复** | 单测失败、lint、边界违规 | 子 agent 循环修复；父 agent 不复核通过不推进 |
| **禁止跨阶段** | M2 migration 失败却做 M3 语音 | 父 agent 拒绝下发 M3 任务包 |

### 5.1 缺资源矩阵（无人干预）

| 缺失 | M0 | M1 | M2 | M3 | M4 | M5 | M6 | M7 |
|------|----|----|----|----|----|----|----|-----|
| API key | OK mock | OK mock | OK | OK 文字 | OK | OK | OK | OK |
| 真机 | 模拟器可 | 模拟器可 | Dev Client 推荐 | **barge-in 需真机或 documented 模拟** | native 需真机/intent | 性能需真机 | **preview 需真机** | 双端 fixture |
| Mac/Xcode | 非必须 | 非必须 | iOS 深调需 | iOS 语音需 | iOS Extension 需 | 可选 | iOS TF 需 | 可选 |
| Token exchange 服务 | N/A | N/A | N/A | mock/staging 二选一 + ADR | N/A | N/A | staging/prod | N/A |
| Apple/Google 账号 | 不阻塞 | 不阻塞 | 不阻塞 | 不阻塞 | 不阻塞 | 不阻塞 | **optional**（release track） | 备份 optional |
| EAS | 不阻塞 | 不阻塞 | 不阻塞 | 不阻塞 | 不阻塞 | 不阻塞 | **optional**（release track） | 不阻塞 |

---

## 6. 禁止事项（全阶段）

| 禁止 | 原因 |
|------|------|
| 跳过 tests / `pnpm check` | 无法无人干预验收 |
| `git commit --no-verify` / 跳过 hooks | 隐藏回归 |
| 长期密钥写入 App 包或 Share Extension | 安全 P0 |
| `packages/core` 泄漏 React/RN/Zustand/env/DOM/Web Audio | 架构 P0 |
| M2 MigrationGate 完成前挂载 LBH 读写 SQLite | 半初始化 |
| 用户确认前 create **permanent** node（分享/OCR/sync） | 产品 invariant #2 |
| raw audio / full article 落盘 | invariant #1 |
| sync **silent create** | invariant #2 / #7 |
| `legacy_radar` 无声降级 | plan §8 |
| 子 agent 静默后台执行跨 gate 任务 | 上下文漂移 |
| 把 M6-GATE 当作完整验收 | plan §README |
| 把 M6-GATE 当作公开商店上线 | M6 = 双端 QA gate |
| 因缺商店账号 FAIL M6-GATE | optional track 标 BLOCKED 即可 |
| 用「目录骨架已存在」跳过 M0 workspace/manifest | 当前 repo 状态 |

---

## 7. 自动检查命令矩阵

> **约定**：「目标命令」可在 M0 才创建脚本；列 **何时必须真实存在**。

| 检查 | 目标命令 | 必须存在阶段 | 失败 |
|------|----------|--------------|------|
| 全仓库 | `pnpm check` | **M0+** | **HARD_STOP** |
| Core 单测 | `pnpm --filter @my-brain/core test` | **M0+** | **HARD_STOP** |
| Core typecheck | `pnpm --filter @my-brain/core exec tsc --noEmit` | **M0+** | **HARD_STOP** |
| Mobile 单测 | `pnpm --filter @my-brain/mobile test` | **M1+** | **HARD_STOP** |
| Mobile typecheck | `pnpm --filter @my-brain/mobile exec tsc --noEmit` | **M1+** | **HARD_STOP** |
| Lint | `pnpm lint` | **M0+** | **HARD_STOP** |
| Core 边界 | `pnpm --filter @my-brain/core run lint:boundaries`（或 dependency-cruiser） | **M0+** | M0-GATE **FAIL** |
| M1 双 eval | `docs/evals/mobile-m1-ingest-loop.md` + `mobile-m1-capture-loop.md` | **M1+** | M1-GATE **FAIL**（**禁止 waiver**） |
| M1 capture 落点 | `provisionalStore` + `ProvisionalQueueSheet` + `packages/core/provisional/queue.test.ts` | **M1+** | M1-GATE **FAIL** |
| Secret scan | `pnpm run scan:secrets`（或 gitleaks/trufflehog 脚本） | **M3+**；M0 起不得提交密钥 | M3-GATE **FAIL**；检出长期密钥 → **HARD_STOP** |
| Bundle artifact grep | dev/preview build 产物 grep（`M3-bundle-secret-grep.log`） | **M3+** | M3-GATE **FAIL**；长期密钥入包 → **HARD_STOP** |
| M3 降级证据 | `docs/evals/m3-voice-degraded.md`（`degradedVoiceEvidence` + Settings `voice_disconnected`） | **M3+** | M3-GATE **FAIL** |
| Storage 夹具 | `pnpm --filter @my-brain/core test -- mobileStorage` | **M2+** | M2-GATE **FAIL** |
| MigrationGate | `pnpm --filter @my-brain/mobile test -- MigrationGate` | **M2+** | M2-GATE **FAIL** |
| M1 错误 SQLite 回归 | `pnpm --filter @my-brain/mobile test -- m1RegistryOnSqlite` | **M2+** | M2-GATE **FAIL** |
| Provider 状态面板 | `pnpm --filter @my-brain/mobile test -- Settings`（Provider 面板 testId） | **M2+** | M2-GATE **FAIL** |
| Ring buffer 白名单 | `pnpm --filter @my-brain/mobile test -- ringBufferWhitelist` + `export` | **M2+** | M2-GATE **FAIL** |
| iOS backup 证据 | excluded-from-backup 配置 + 审查清单（gate report E2-IOS-BU） | **M2+** | M2-GATE **FAIL** |
| SSRF 全集 fixture | `pnpm --filter @my-brain/core test -- ssrf` + `urlFetchGuard`（§2.1 全 ID） | **M4+** | M4-GATE **FAIL**（**禁止 waiver**） |
| Provisional FSM | `pnpm --filter @my-brain/core test -- provisionalQueueFsm` | **M4+** | M4-GATE **FAIL** |
| M4 前置 M3 | `reports.M3.verdict == PASS`（FULL PASS 路径） | **M4 FULL PASS** | **HARD_STOP** |
| M5 evidence 分测 | `weatherEvidence` + `replayEvidence` + `reverseQuestionEvidence` | **M5+** | M5-GATE **FAIL** |
| M5 UserMode fixture | `m5-signature-fixtures.json` + `m5-modes/manifest.json`（5 模式） | **M5+** | M5-GATE **FAIL** |
| Replay 冷启动 | `pnpm --filter @my-brain/mobile test -- replayColdStart` + `docs/evals/m5-replay-perf.md` | **M5+** | M5-GATE **FAIL**；缺 perf artifact 伪 PASS → **HARD_STOP** |
| Mobile E2E 本地 | `maestro test apps/mobile/e2e/` | **M2+** 本地；**M6+** CI | M2/M6 **FAIL** |
| E2E CI | `.github/workflows/mobile-e2e.yml` | **M6+**（**硬需**） | M6-GATE **FAIL** |
| Telemetry 白名单 | `pnpm --filter @my-brain/mobile test -- whitelist` | **M6+** | M6-GATE **FAIL** |
| M6 双端 smoke | `docs/evals/m6-ios-smoke.md` + `m6-android-smoke.md`（§8.1.1 结构化） | **M6+** | **NEEDS_DEVICE_EVIDENCE**（单端） |
| Sentry / Analytics | optional adapter（默认 off） | **M6+** | **不 FAIL gate** |
| Perf 冒烟 | `pnpm --filter @my-brain/mobile test -- perf` | **M1/M5** | M5-GATE **FAIL** |
| Voice eval | `docs/evals/voice-intent-fixtures.json` + 执行记录 | **M3+** | M3-GATE **FAIL** |
| Schema/migration | migration 版本与 `migrations.ts` 一致测试 | **M2+** | M2-GATE **FAIL** |
| M7 报告链 | M0–M6 + M7A + M7B 共 9 份 PASS | **M7-GATE** | M7-GATE **FAIL** |
| M7 ingest gate | `pnpm --filter @my-brain/core test -- ingestGate` | **M7+** | M7B-GATE **FAIL**；bypass → **HARD_STOP** |
| Expo 启动 | `pnpm --filter @my-brain/mobile exec expo start` | **M0+** | M0-GATE **FAIL** |
| Gate verifier | `pnpm mobile:gate M0`…`M6`、`M7A`、`M7B`、聚合 `M7` | **M0+** | 当前阶段 gate **FAIL** |

**M0 须新增的脚本（若不存在则 M0-GATE FAIL）**：

- 根 `pnpm-workspace.yaml` 含 `apps/mobile`、`packages/core`
- `@my-brain/core`、`@my-brain/mobile` 的 `package.json` + `tsconfig.json`
- mobile：`passWithNoTests: false` 或等价（见 README）
- `specs/mobile-app/EXECUTION_STATE.json`（符合 [`EXECUTION_STATE.schema.json`](./EXECUTION_STATE.schema.json)）
- `tools/mobile-execution/verify-stage.ts` 或等价 verifier，并接入 `pnpm mobile:gate M{n}`

---

## 8. 阶段验收报告模板

保存路径：`specs/mobile-app/reports/M{n}-GATE-report.md`（M7 子门：`M7A-GATE-report.md`、`M7B-GATE-report.md`；总验收：`M7-GATE-report.md`）

```markdown
# M{n}-GATE 验收报告
- **阶段**：M{n} — {title}
- **判定**：PASS | FAIL | DEGRADED | **NEEDS_DEVICE_EVIDENCE**（同阶段等待真机证据；**非 FULL PASS**；**不得批准 M(n+1)**）
- **日期**：YYYY-MM-DD
- **执行者**：composer2.5 子 agent
- **监督者**：GPT-5.5 父 agent
## 1. Enter 条件核对
- [ ] 上一阶段 GATE PASS（附报告链接）
- [ ] 已重读 MOBILE_PRODUCT_PLAN + M{n} spec + EXECUTION_GUARDRAILS
## 2. Exit checklist（复制 spec §8）
- [ ] …
## 3. 命令证据
| 命令 | exit code | 摘要 |
|------|-----------|------|
| pnpm check | 0 | … |
## 4. 测试 / E2E / 真机
- 路径 + 结果 + 失败日志摘录
## 5. 截图 / 录屏
- 文件路径或 artifact ID
## 6. Commit / Diff
- commit hash(es) 或 PR
- 关键文件列表
## 7. 风险与 waivers
- 文档修订 deferred / mock provider / …
## 8. 下一阶段许可
- [ ] `pnpm mobile:gate M{n}` PASS
- [ ] `EXECUTION_STATE.json` 已更新为 `allowedNextAction = run_M{n+1}_only`
- [ ] 批准进入 M{n+1} | [ ] 拒绝 — 原因：
## 9. 父 agent 签核
- 结论 + 备注
```

**M7A / M7B 报告**：分别保存为 `M7A-GATE-report.md`、`M7B-GATE-report.md`；`EXECUTION_STATE.reports` 键为 `M7A`、`M7B`。

**M7-GATE 额外要求**（M7B PASS 后、进入 `complete` 前）：附录列出 **`M0-GATE-report.md` … `M6-GATE-report.md`** 及 **`M7A-GATE-report.md`、`M7B-GATE-report.md`** 共 **9 份**报告全部 PASS 链接；正文须含 **M7A snapshot 最小实体集**验收摘要、**信任优先级**（用户纠偏 > 行为 > LLM）、**local-first 不变量**（ingest 门控 / archive 非删 / 无 silent create）签核；签核后写入 `reports.M7`。

---

## 9. 单窗口长任务协议

### 9.1 Todo 与阶段边界

- 父 agent todo：**最多一个 in_progress 阶段**
- 子 agent 任务描述须含：`M{n}`、`M{n}-GATE`、禁止跨阶段
- 阶段完成：父 agent 将 todo 标 completed **仅当** 报告 PASS

### 9.2 上下文恢复

每进入新 M 阶段，父 agent 在 prompt 中 **重新注入**：

1. 本文件 §3 状态机当前节点  
2. 目标 `M{n}-*.md` 全文或 §8 验收清单  
3. 上一阶段 `M{n-1}-GATE-report.md` 结论  
4. 当前 **禁止事项** §6 摘要  

子 agent **不得**依赖「我记得 M0 做了什么」；须读文件。

### 9.3 子 agent 调度

- **禁止** `run_in_background: true` 跑过 gate 的实施任务  
- 子 agent 返回须含：变更文件列表、测试命令输出、未决 blocker  
- 父 agent 未验收前 **不** 并行开 M(n) 与 M(n+1) 两个实施子 agent

### 9.4 阶段报告节奏

- 每个 M 阶段结束：**一份** GATE 报告 + 父 agent 给用户 3–5 句摘要（若用户在看）  
- M7 结束：汇总 §0–7 追溯表 + 完整验收判定

---

## 10. 返工预防清单（前阶段必须锁死）

| 决策 | 锁死阶段 | 后续影响若漂移 |
|------|----------|----------------|
| `@my-brain/core` public export 清单 | **M0** | M1+ 反复改 import；边界 CI 失效 |
| `readAppEnv()` 三端契约 | **M0** | 密钥泄漏、配置分叉 |
| ingest / auto-curate **deps 注入**接口 | **M0–M1** | core 无法测；Zustand 泄漏 |
| SQLite **schema version** + migration 链 | **M2** | M5 Replay / M7 sync 全量返工 |
| **MigrationGate** 启动语义 | **M2** | 半持久化、假成功 UI |
| `coTransactGraphAndHistory` 事务语义 | **M2** | 入库与 undo 不一致 |
| **Token exchange** ADR + 短期 token 存储 | **M3 前** | 无法上架；安全审计 FAIL |
| RN **原生 WS Header** ADR | **M3** | RealtimeVoiceTransportError 无解 |
| Share Extension **payload schema**（App Group） | **M4** | M7 同步与捕获合并冲突 |
| **SSRF** allowlist 规则 | **M4** | 安全 incident |
| Provisional vs permanent **晋升唯一出口** | **M2–M4** | invariant 破坏 |
| MemoryReplay **incremental cursor** schema | **M2 预留 / M5 实现** | 万节点性能崩溃 |
| DegradedMode **枚举与 UI 映射** | **M1** | silent mock |
| M1 **ingest + capture 双 eval** | **M1** | M2+ 主路径缺口；**禁止 waiver** |
| M1 **capture v0 落点**（FAB/Sheet/store/core provisional） | **M1** | M4 队列 FSM 返工 |
| Settings **Provider 状态面板** | **M2** | M3/M6 诊断不可见 |
| **Ring buffer 白名单** + diagnostic export | **M2** | M6 隐私泄漏；**HARD_STOP** 级 incident |
| **`storage_degraded` 分层** vs `StorageInitError` | **M2** | 用户误判全库损坏 |
| M1 错误注册表 **SQLite 回归** | **M2** | pending 丢失；ingest 半成功 |
| **Bundle artifact grep** + secret scan | **M3** | 长期密钥入包 → **HARD_STOP** |
| **`degradedVoiceEvidence`** / Settings `voice_disconnected` | **M3** | silent 断连 |
| **SSRF allowlist 全集 fixture** | **M4** | 安全 incident → **FAIL** |
| **`provisionalQueueFsm`** 复用 Conductor | **M4** | invariant #2 破坏 |
| M5 **三类 evidence 分测** + 5 UserMode | **M5** | 空话 Weather/Replay/Question |
| **`replayColdStart` + m5-replay-perf.md** | **M5** | 万节点性能崩溃 |
| M6 smoke **M3/M4/M5 路径** + **E2E CI 硬需** | **M6** | gate 与产品脱节 |
| Sentry/Analytics **字段白名单** | **M6** | 隐私泄漏；**Sentry 本身 optional** |
| M7A **snapshot 最小实体集** + manifest | **M7A** | 换机丢 correction/provisional |
| Sync **信任优先级** + **local-first 不变量** | **M7B** | silent merge / ingest bypass |
| Sync **`confirmedAt` / `ingestSource`** 字段 | **M2 schema / M7 逻辑** | sync bypass 入库 → **HARD_STOP** |
| **Sync conflict** 用户可见策略 | **M7 设计起** | silent merge |
| E2E **主路径 yaml** 与 M1 双闭环一致 | **M2 起草 / M6 CI** | CI 与产品脱节 |

---

## 11. P0/P1 缺口（已纳入护栏）

| ID | 缺口 | 处理 |
|----|------|------|
| P0-1 | 骨架目录存在但 **无 workspace/manifest** | M0-GATE 显式要求；禁止误判已完成 |
| P0-2 | M3 无 token exchange 服务 | **仅 M3 内** mock + ADR 继续修复；**FULL PASS** 需 staging 或 signed-off mock eval；**M3-GATE 未 PASS 禁止 M4** |
| P0-3 | M6 无 Apple/Google 账号 | **optional track BLOCKED**；双端 dev build smoke 仍须 PASS gate |
| P0-4 | M2 前 LBH 挂 SQLite | MigrationGate hard stop |
| P1-1 | M0 文档「有条件 PASS」易滥用 | 无人干预：**waiver 须进 GATE 报告 + 父 agent 签核**；**`docs/KNOWLEDGE_OS_VISION.md` 缺修订且无 waiver → FAIL** |
| P1-2 | M4 文字/分享可在 M2 后并行；**M4-GATE FULL PASS 仍须 M3** | 禁止 M4 FULL PASS 或语音 M4 bypass M3（**HARD_STOP**）；允许 M2 后并行非语音捕获 |
| P1-3 | `scan:secrets` / `lint:boundaries` / **bundle artifact grep** 脚本尚未创建 | M0 创建 boundaries；M3 前创建 scan + bundle grep；缺失 → 对应 gate **FAIL** |
| P1-4 | M1 仅 ingest **或** capture 旧口径 | **ingest + capture 双 eval 各 ≥1**；缺任一 → **FAIL**（**禁止 waiver**） |
| P1-5 | M5 仅 Weather evidence 测试 | **Weather/Replay/Question 三类 evidence 分测** + 5 UserMode fixture |

---

## 12. 无人干预可行性判定（审查结论）

| 维度 | 判定 |
|------|------|
| Spec 与 plan 对齐 | M0–M7 与 `MOBILE_PRODUCT_PLAN.md` **一致**；guardrails DoR/DoD/命令矩阵已与 M spec §8 同步 |
| Gate 可机器验证 | M0–M2、M4–M5 **高**；M3 bundle grep + M6 E2E **硬需**；M3/M6 真机处已标 NEEDS_DEVICE_EVIDENCE；M6 商店账号 optional |
| 上下文漂移防护 | 本文件 §9 + 每阶段重读 **可执行** |
| 当前 repo 就绪度 | **未就绪**：仅 README 骨架 → **必须从 M0 实施**，不可跳过 |

**总结**：在 **父 agent 严格执行本护栏、M0 补齐 monorepo、M6 前准备好双端 dev build 真机** 的前提下，**可以**支撑同一窗口从 M0 顺序执行到 M7；若 M6 双端 smoke 或 M3 真机长期不可用，流水线须在对应 gate **停止并出报告**；缺商店账号仅阻塞 optional release track，**不阻塞** M6-GATE 或 M7。

---

## 13. 快速索引

- 产品计划：[`docs/MOBILE_PRODUCT_PLAN.md`](../../docs/MOBILE_PRODUCT_PLAN.md)
- Spec 索引：[`specs/mobile-app/README.md`](./README.md)
- 报告目录：`specs/mobile-app/reports/`（实施时创建）
- 骨架说明：[`apps/mobile/README.md`](../../apps/mobile/README.md) · [`packages/core/README.md`](../../packages/core/README.md)
