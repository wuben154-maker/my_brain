# M 阶段 Gate Verifier 规格

> **目标**：M0 创建真实脚本前，先把 verifier 行为写死。  
> **目标命令**：`pnpm mobile:gate M0` … `pnpm mobile:gate M6`、`pnpm mobile:gate M7A`、`pnpm mobile:gate M7B`、`pnpm mobile:gate M7`（聚合 M7A + M7B + M0–M6 报告链）。  
> **实现落点（M0）**：`tools/mobile-execution/verify-stage.ts` 或等价 TypeScript CLI。

---

## 1. Verifier 职责

Gate verifier 是父 agent 的刹车，不是建议器。

它必须回答一个问题：

```text
当前阶段 M{n} 是否真的允许推进到 M{n+1}？
```

只允许四种结果：

```text
PASS                    -> 父 agent 可签核并推进 EXECUTION_STATE
FAIL                    -> 留在当前 M 阶段修复
NEEDS_DEVICE_EVIDENCE   -> 机器检查通过但缺真机/人工证据；非 FAIL 非 PASS；停在当前阶段
HARD_STOP               -> 写 blocker，停止流水线
```

`DEGRADED` 可以写入报告（如 M6 smoke 单路径 `result: DEGRADED`），但不得作为推进下一阶段的 verifier 结果。  
`NEEDS_DEVICE_EVIDENCE` **不得**推进 `M(n+1)`；补设备证据后须复验。适用于 M3 barge-in、M4 分享扩展/intent 真机、M5 真机 Replay perf（见 §3.3.5）、M6 双端 smoke、M2 iOS excluded-from-backup 可选真机抽查。

---

## 2. 输入文件

Verifier 每次运行必须读取：

| 文件 | 用途 |
|------|------|
| `docs/MOBILE_PRODUCT_PLAN.md` | 产品不变量与阶段定义 |
| `specs/mobile-app/EXECUTION_GUARDRAILS.md` | gate 权威规则 |
| `specs/mobile-app/GATE_VERIFIER_SPEC.md` | 本 spec（自引用；M0 DoR 硬需） |
| `specs/mobile-app/EXECUTION_STATE.json` | 当前阶段锁 |
| `specs/mobile-app/M{n}-*.md` | 当前阶段验收标准 |
| `specs/mobile-app/reports/M{n}-GATE-report.md` | 阶段证据（M7 用 `M7A`/`M7B`/`M7` 路径，见 §3.1） |
| 上一阶段 PASS 报告 | M0 除外；M7A 读 M6；M7B 读 M7A |

**DoR / 控制面输入（M0 起）：**

| 条件 | Verifier 判定 |
|------|---------------|
| `EXECUTION_GUARDRAILS.md` 不存在或不可读 | **`HARD_STOP`**（停止 M0 代码；先恢复 guardrails） |
| `GATE_VERIFIER_SPEC.md` 不存在或不可读 | **`HARD_STOP`**（停止 M0 代码；先恢复 gate spec） |
| 其他必须输入文件缺失 | **`FAIL`** |

`EXECUTION_STATE.json` 在 M0 前可不存在，但 M0-GATE 前必须由 M0 创建。

---

## 3. 检查分类

### 3.1 顺序检查

**M0–M6**（`n` = 0…6）：

```text
state.currentPhase == M{n}
state.allowedNextAction == run_M{n}_only
if n > 0:
  reports[M{n-1}].verdict == PASS
  state.lastPassedPhase == M{n-1}
M{n}-GATE-report.md exists
M{n}-GATE-report verdict == PASS
```

**M7A**（M6 PASS 后进入；**不可跳过**）：

```text
state.currentPhase == M7A
state.allowedNextAction == run_M7A_only
state.lastPassedPhase == M6
reports.M6.verdict == PASS
M7A-GATE-report.md exists
M7A-GATE-report verdict == PASS
```

**M7B**（**M7A PASS 后**进入；**不可与 M7A 并行签核**）：

```text
state.currentPhase == M7B
state.allowedNextAction == run_M7B_only
state.lastPassedPhase == M7A
reports.M7A.verdict == PASS
M7B-GATE-report.md exists
M7B-GATE-report verdict == PASS
```

**M7 聚合验收**（M7B PASS 后、进入 `complete` 前）：

```text
reports.M7A.verdict == PASS
reports.M7B.verdict == PASS
下列 9 份报告均存在且 verdict == PASS:
  specs/mobile-app/reports/M0-GATE-report.md
  specs/mobile-app/reports/M1-GATE-report.md
  specs/mobile-app/reports/M2-GATE-report.md
  specs/mobile-app/reports/M3-GATE-report.md
  specs/mobile-app/reports/M4-GATE-report.md
  specs/mobile-app/reports/M5-GATE-report.md
  specs/mobile-app/reports/M6-GATE-report.md
  specs/mobile-app/reports/M7A-GATE-report.md
  specs/mobile-app/reports/M7B-GATE-report.md
M7-GATE-report.md exists
M7-GATE-report verdict == PASS
M7-GATE-report 正文附录须逐条链接上表 9 份报告
```

`M7-GATE` **不是** `currentPhase` 取值；它是 M7A + M7B 通过后的**总验收报告**与 `pnpm mobile:gate M7` 聚合检查。

失败：`FAIL`。若发现下一阶段/子门已被执行或报告已生成：`HARD_STOP`，因为流水线越界（例：M7B 报告在 M7A 未 PASS 时出现；M7-GATE 在 M7B 未 PASS 时出现）。

### 3.2 报告检查

报告必须包含：

```text
- 阶段
- 判定
- 日期
- 执行者
- 监督者
- Enter 条件核对
- Exit checklist
- 命令证据
- 测试 / E2E / 真机证据
- Commit / Diff
- 风险与 waivers
- 下一阶段许可
- 父 agent 签核
```

**M0 附加（报告或 spec §0.5 附表）：**

- **文档修订登记表**：100% 有 owner + 状态（`merged` / `PR-open` / `waiver` + 理由）
- **`docs/KNOWLEDGE_OS_VISION.md`** 项须为 `merged` 或签核 `waiver`；否则 **`FAIL`**（**不可 waiver 跳过 KNOWLEDGE_OS 项本身**）

**M6 optional release track 术语（与 [`M6-release-observability-and-mobile-e2e.md`](./M6-release-observability-and-mobile-e2e.md)、[`README.md`](./README.md) 对齐）：**

- 缺 Apple/Google 账号 / EAS / TestFlight / Play：报告标 **`BLOCKED`**（缺资源）或 **`WAIVED`**（已知放弃 + 原因）
- **`BLOCKED` / `WAIVED` 不得当作 gate FAIL**；不得因此判 M6-GATE FAIL

`DEGRADED` / `NEEDS_DEVICE_EVIDENCE` / `FAIL` 报告不能推进阶段。`BLOCKED` / `WAIVED` 仅用于 optional track，不替代 gate verdict。

### 3.3 命令检查

Verifier 不只看报告文字。它要运行或确认阶段命令。下表为摘要；**§3.3.1–§3.3.8** 为机器可实现的硬检查清单。

| 阶段 | 必跑命令 / 检查（摘要） |
|------|-------------------------|
| M0 | `pnpm check`、core boundary、`expo start`、**§0.5 文档修订登记表**、DoR 可读 |
| M1 | `pnpm check`、mobile unit、**ingest + capture 双 eval**、capture 落点、节点预算 |
| M2 | `pnpm check`、storage fixture、MigrationGate、**§3.4 M2 结构化证据键** |
| M3 | `pnpm check`、voice tests、**secret scan + bundle artifact grep**、**degradedVoiceEvidence ≥2** |
| M4 | `pnpm check`、**SSRF fixture 全集**、**provisionalQueueFsm**、**ingestGate**；FULL PASS 须 M3-GATE PASS |
| M5 | `pnpm check`、**五 UserMode fixture**、**三类 evidence 分测**、**replayColdStart**、**m5-replay-perf**、万节点 budget |
| M6 | `pnpm check`、E2E CI、ring buffer/diagnostic、**§3.3.7 smoke 五字段**；双端 smoke |
| M7A | `pnpm check`、device-migration、encrypted-backup、correction history |
| M7B | `pnpm check`、sync gate、conflict fixture、**M7A PASS** |
| M7 | **9 份 PASS 报告链**（M0–M6 + M7A + M7B）+ M7-GATE 报告 |

命令不存在但已到「必须存在阶段」：**`FAIL`**。  

命令失败：**`FAIL`**。  

报告称 PASS 但命令失败：**`HARD_STOP`**（伪通过）。

命令在超时内未完成（见 §3.3.0 `runCommand` 超时）：**`FAIL`**；若报告已声称 PASS 则 **`HARD_STOP`**。

#### 3.3.0 命令执行与超时（M0 verifier 实现）

| 规则 | 说明 |
|------|------|
| `MOBILE_GATE_EXECUTE=1` | 才真实执行 `pnpm check` 等昂贵命令；否则跳过并记 PASS（dry-run） |
| `pnpm check` 超时 | **900s**（15 min）；Windows 全量 vitest 约 8–10 min，超时视为 FAIL 而非无限挂起 |
| 其他 gate 命令超时 | **180s**（3 min） |
| 进度日志 | stderr 打印 `[mobile-gate] <check-id>: running \`<cmd>\`` |
| M0 去重 | **仅**执行 `m0-pnpm-check`；不另跑通用 `pnpm-check`（避免双倍 ~16+ min） |

#### 3.3.1 M0 命令检查（机器清单）

| 检查 ID | 动作 | PASS 条件 | 否则 |
|---------|------|-----------|------|
| `m0-pnpm-check` | `pnpm check` | exit 0 | FAIL |
| `m0-core-boundary` | `pnpm --filter @my-brain/core run lint:boundaries` 或等价 | exit 0；无 React/RN/Zustand 泄漏 | FAIL |
| `m0-expo-start` | `expo start` 占位屏证据 | 报告附启动日志/截图 | FAIL |
| `m0-workspace` | `apps/mobile` + `packages/core` 有真实 manifest/tsconfig | 非 README-only 骨架 | FAIL |
| `m0-gate-script` | `pnpm mobile:gate M0` | 脚本存在且本 run 绿 | FAIL |
| `m0-dor-guardrails` | 读 `EXECUTION_GUARDRAILS.md` | 可读 | **HARD_STOP** |
| `m0-dor-gate-spec` | 读 `GATE_VERIFIER_SPEC.md` | 可读 | **HARD_STOP** |
| `m0-doc-registry` | 读 M0-GATE 报告或 spec §0.5 **文档修订登记表** | 100% owner+状态；**KNOWLEDGE_OS_VISION.md** = `merged` 或签核 `waiver` | **FAIL**（KNOWLEDGE_OS 缺登记/未 merged 且无 waiver） |

#### 3.3.2 M1 命令检查（机器清单）

| 检查 ID | 动作 | PASS 条件 | 否则 |
|---------|------|-----------|------|
| `m1-pnpm-check` | `pnpm check` | exit 0 | FAIL |
| `m1-mobile-unit` | mobile + core M1 路径单元测试 | exit 0 | FAIL |
| `m1-eval-ingest` | 文件存在 | `docs/evals/mobile-m1-ingest-loop.md`（或等价记录） | **FAIL**（**禁止 waiver**） |
| `m1-eval-capture` | 文件存在 | `docs/evals/mobile-m1-capture-loop.md`（或等价记录） | **FAIL**（**禁止 waiver**） |
| `m1-capture-fixtures` | JSON 存在且 ≥1 条 | `docs/evals/capture-loop-fixtures.json` | **FAIL** |
| `m1-capture-landing` | 路径存在（非空 stub） | `apps/mobile/components/QuickCaptureFab.tsx`、`ProvisionalQueueSheet.tsx`、`apps/mobile/stores/provisionalStore.ts`、`packages/core/provisional/queue.ts`（或 spec 等价落点） | **FAIL** |
| `m1-node-budget` | perf test 或报告 | 首页 ≤80 可见节点 | FAIL |
| `m1-dual-smoke` | 报告证据 | Android + iOS 各 1 次主路径 | FAIL（模拟器可；非 M6 级双端 dev build） |

**禁止**：用 waiver 跳过 ingest/capture 双闭环或 capture 落点 → 视为 **HARD_STOP** 风险。

#### 3.3.3 M2 命令检查（机器清单）

| 检查 ID | 动作 | PASS 条件 | 否则 |
|---------|------|-----------|------|
| `m2-pnpm-check` | `pnpm check` | exit 0 | FAIL |
| `m2-storage-fixture` | 三端 storage 行为夹具 mobile 轨 | PASS | FAIL |
| `m2-migration-gate` | MigrationGate test | migration 完成前无 LBH testId | FAIL |
| `m2-persistence-e2e` | 杀进程恢复 E2E / 真机 | pending + correction history 可恢复 | FAIL |

**M2 结构化证据（§3.4）**：M2-GATE 报告须含 §3.4 所列 **verifier 键**；缺键 → **FAIL**。iOS excluded-from-backup 缺可选真机抽查 → **`NEEDS_DEVICE_EVIDENCE`**（不替代配置+审查必填项）。

#### 3.3.4 M3 命令检查（机器清单）

| 检查 ID | 动作 | PASS 条件 | 否则 |
|---------|------|-----------|------|
| `m3-pnpm-check` | `pnpm check` | exit 0 | FAIL |
| `m3-voice-tests` | voice / ingestIntent / mockRealtime 等 | exit 0 | FAIL |
| `m3-secret-scan` | `pnpm run scan:secrets` 或 guardrails §7 等价 | exit 0；附 log 路径 | **FAIL** |
| `m3-bundle-grep` | dev/preview **build artifact** grep | 无长期 provider key / `VITE_*` 泄漏；附 log | scan 失败 **FAIL**；命中长期密钥 **HARD_STOP** |
| `m3-degraded-voice` | 读 `docs/evals/m3-voice-degraded.md` 或报告 `degradedVoiceEvidence` | **≥2** 个降级场景有结构化证据 | FAIL |
| `m3-barge-in` | 真机或 signed-off eval | 双端插话证据 | **NEEDS_DEVICE_EVIDENCE** |

长期密钥**入仓**或**入包**：**HARD_STOP**（见 §3.5）。

#### 3.3.5 M4 命令检查（机器清单）

| 检查 ID | 动作 | PASS 条件 | 否则 |
|---------|------|-----------|------|
| `m4-pnpm-check` | `pnpm check` | exit 0 | FAIL |
| `m4-m3-pass` | 读 `M3-GATE-report.md` | verdict == PASS（**FULL PASS 硬需**） | **HARD_STOP**（绕过 M3） |
| `m4-ssrf-fixtures` | `ssrf.test.ts` + `urlFetchGuard.test.ts` | 覆盖 [`M4`](./M4-quick-capture-and-provisional-queue.md) §2.1 **全部 Fixture ID**，且维度含 scheme / port / IP / **IPv6 literal** / DNS 私网 / redirect 终态与 limit / **timeout** / **response too large** | **FAIL**（**禁止 waiver**） |
| `m4-queue-fsm` | `packages/core/provisional/provisionalQueueFsm.test.ts`（或 spec 等价路径） | 存在且 green；三意图走 Conductor | **FAIL** |
| `m4-ingest-gate` | `packages/core/provisional/ingestGate.test.ts` | 存在且 green；share/OCR bypass 否定 | **FAIL** |
| `m4-share-e2e` | share E2E + no-permanent-before-confirm | green | FAIL |
| `m4-share-device` | Android intent / iOS Extension 真机 | 报告有设备证据 | **NEEDS_DEVICE_EVIDENCE** |

§2.1 最低 Fixture ID（缺任一项 → FAIL）：`ssrf-http-scheme`、`ssrf-port-80`、`ssrf-ipv4-literal`、`ssrf-localhost`、`ssrf-dns-rebind`、`ssrf-redirect-private`、`ssrf-redirect-limit`、`ssrf-ok-public`；另须有时序/体积与 **IPv6** 拒绝用例（可与上表合并 case，但 grep/test 名须可审计）。

#### 3.3.6 M5 命令检查（机器清单）

| 检查 ID | 动作 | PASS 条件 | 否则 |
|---------|------|-----------|------|
| `m5-pnpm-check` | `pnpm check` | exit 0 | FAIL |
| `m5-perf-tests` | `pnpm --filter @my-brain/mobile test -- perf` + `replayColdStart.test.ts` | exit 0 | **FAIL** |
| `m5-fixtures-json` | `docs/evals/m5-signature-fixtures.json` | 存在；**5 种 primary UserMode** 各 ≥1 fixture | **FAIL** |
| `m5-manifest` | `apps/mobile/fixtures/m5-modes/manifest.json` | 存在且 verifier 可读 | **FAIL** |
| `m5-evidence-split` | `weatherEvidence.test.ts`、`replayEvidence.test.ts`、`reverseQuestionEvidence.test.ts`（或等价分文件） | 均存在且 green | **FAIL** |
| `m5-node-budget` | 万节点 fixture + `nodeBudget.test.ts` | 可见节点 ≤80 | **FAIL** |
| `m5-flags-default-on` | Feature flags 默认配置 | default-on 下三大招牌可验收 | **FAIL** |
| `m5-replay-perf-md` | `docs/evals/m5-replay-perf.md` | 真机 Replay P50 **<500ms** 证据 | 见下表 |

**M5 真机 perf 判定边界：**

| 条件 | Verifier 判定 |
|------|---------------|
| `replayColdStart.test.ts` 或 CI perf 失败 | **FAIL** |
| 真机 P50 ≥500ms（有 `m5-replay-perf.md` 测量） | **FAIL** |
| 机器测试绿，缺 `m5-replay-perf.md` 且报告**未**声称真机 perf PASS | **`NEEDS_DEVICE_EVIDENCE`** |
| 机器测试绿，报告**声称**真机 perf PASS 但无 `m5-replay-perf.md` | **HARD_STOP**（伪通过） |

#### 3.3.7 M6 命令检查（机器清单）

| 检查 ID | 动作 | PASS 条件 | 否则 |
|---------|------|-----------|------|
| `m6-pnpm-check` | `pnpm check` | exit 0 | FAIL |
| `m6-e2e-ci` | Maestro/Detox CI | green（retry ≤2） | FAIL |
| `m6-ring-buffer` | ring buffer whitelist + diagnostic export | 硬需满足 | FAIL |
| `m6-smoke-schema` | 读 `docs/evals/m6-*-smoke.md` 或 M6 报告 | 每条 smoke 含 **§3.3.7.1 五字段** | FAIL |
| `m6-dual-device` | iOS + Android dev/preview build smoke | 双端 §8.1.1 记录齐全 | 缺任一端 → **NEEDS_DEVICE_EVIDENCE** |
| `m6-optional-track` | EAS/TestFlight/Play | 缺账号仅标 **BLOCKED** / **WAIVED** | **不得 FAIL gate** |
| `m6-sentry` | Sentry/Analytics | optional；未启用不 FAIL | — |

**§3.3.7.1 Smoke 证据结构化 schema（Harness 硬需，对齐 M6 §8.1.1）**

每条 smoke 记录（表格行或 JSON 对象）**必须**含：

| 字段 | 说明 |
|------|------|
| `device` | 设备型号 + OS 版本 |
| `build` | dev/preview build 标识（version + buildNumber + commit 或 EAS build ID） |
| `path` | smoke 路径 ID（如 `m3-voice-barge-in`、`m4-share-android-intent`、`m5-memory-replay`） |
| `result` | `PASS` \| `FAIL` \| `DEGRADED`（单路径 DEGRADED 不自动等同 gate FAIL） |
| `artifact` | 截图/录屏/导出路径或 artifact ID + 时间戳 |

Verifier 解析 smoke 文档时：缺字段 → **FAIL**；缺 iOS **或** Android 端记录 → **`NEEDS_DEVICE_EVIDENCE`**（**不得 PASS**）。

#### 3.3.8 M7A / M7B / M7 命令检查

| 阶段 | 检查 |
|------|------|
| M7A | `pnpm check`；device-migration fixture；encrypted-backup；correction history 可恢复；`M7A-GATE-report.md` PASS |
| M7B | `pnpm check`；`ingestGate.test.ts` sync 不 bypass；conflict fixture；**前置 `M7A-GATE PASS`** |
| M7 | **`pnpm mobile:gate M7`** 聚合：9 份报告（M0–M6 + M7A + M7B）均 PASS + `M7-GATE-report.md` PASS |

### 3.4 M2 Gate 结构化证据键（verifier 可读）

`M2-GATE-report.md` 须含下列键（对齐 [`M2-local-storage-and-diagnostics.md`](./M2-local-storage-and-diagnostics.md) §8.1）；verifier 按 key 解析，**缺键 → FAIL**：

| verifier 键 | 证据 ID | 必填内容 |
|-------------|---------|----------|
| `migration_gate` | E2-MIG | MigrationGate test 输出；migration 中无 LBH testId |
| `kill_process_recovery` | E2-PERSIST | 杀进程前后 pending + correction history 快照 |
| `diagnostic_whitelist` | E2-RING | `ringBufferWhitelist.test.ts` + export 扫描 PASS |
| `provider_status_panel` | E2-PROVIDER | Settings Provider 面板；`ProviderConfigError` fixture |
| `ingest_proposal_persist` | E2-INGEST | `IngestProposalError` → pending 仍在 SQLite |
| `android_backup_exclude` | E2-ANDROID-BU | `backup_rules.xml` 片段 + 测试 PASS |
| `ios_backup_exclude` | E2-IOS-BU | 配置片段 + 审查 checklist（真机抽查缺 → NEEDS_DEVICE_EVIDENCE） |
| `degraded_mode_layering` | E2-DEGRADED | persistWarning 旗标 UI；非 migration 阻塞 |

**保留**：`storage fixture` + `MigrationGate` test 为 §3.3.3 命令检查，与上表并存。

### 3.5 禁止项检查

以下命中即 **`HARD_STOP`**（除非表内另有 FAIL 分级）：

| 禁止项 | 检查方式 |
|--------|----------|
| 长期密钥入包 / 入仓 | M3+ **`pnpm run scan:secrets`** + **bundle artifact grep**（§3.3.4） |
| core 泄漏 React/RN/Zustand/env/DOM/Web Audio/UI 库 | dependency-cruiser / ESLint / import scan |
| M2 前挂 LBH 读写 SQLite | testId + boot order test |
| M4-GATE FULL PASS 绕过 M3 | `reports.M3.verdict == PASS`；否则 HARD_STOP |
| 用户确认前 permanent node | core invariant + E2E |
| raw audio / full article 落盘 | schema/invariant test |
| sync silent create | `ingestGate.test.ts` sync 用例 |
| Expo Go 冒充 M6 | dev/preview build smoke + §3.3.7.1 五字段 |
| 因缺商店账号 FAIL M6 | optional track 仅 **BLOCKED** / **WAIVED** |
| M5 报告声称真机 perf PASS 但无 `m5-replay-perf.md` | HARD_STOP（伪通过） |
| M1 用 waiver 跳过双 eval 或 capture 落点 | HARD_STOP 风险 |
| `--no-verify` 或跳 hooks | git command log / hook output |
| DoR：guardrails / gate spec 不可读 | **HARD_STOP**（§2） |

---

## 4. 阶段推进规则

Verifier PASS 后，父 agent 才能更新 `EXECUTION_STATE.json`（须符合 [`EXECUTION_STATE.schema.json`](./EXECUTION_STATE.schema.json)）。

**M0–M5**（`n` = 0…5）PASS 后：

```json
{
  "lastPassedPhase": "M{n}",
  "currentPhase": "M{n+1}",
  "status": "not_started",
  "allowedNextAction": "run_M{n+1}_only",
  "reports": { "M{n}": { "path": "specs/mobile-app/reports/M{n}-GATE-report.md", "verdict": "PASS", "verifiedAt": "…" } }
}
```

**M6 PASS** 后 → 进入 **M7A**（不是 `M7`）：

```json
{
  "lastPassedPhase": "M6",
  "currentPhase": "M7A",
  "status": "not_started",
  "allowedNextAction": "run_M7A_only"
}
```

**M7A PASS** 后 → 进入 **M7B**：

```json
{
  "lastPassedPhase": "M7A",
  "currentPhase": "M7B",
  "status": "not_started",
  "allowedNextAction": "run_M7B_only",
  "reports": { "M7A": { "path": "specs/mobile-app/reports/M7A-GATE-report.md", "verdict": "PASS", "verifiedAt": "…" } }
}
```

**M7B PASS** 后 → 产出 **M7-GATE** 聚合报告并进入 **complete**：

1. 父 agent 撰写 `specs/mobile-app/reports/M7-GATE-report.md`（正文附录 **M0–M6 + M7A + M7B 共 9 份** PASS 报告链接）。
2. 运行 `pnpm mobile:gate M7`（校验 9 份报告链 + M7A/M7B 顺序）。
3. M7-GATE PASS 后更新：

```json
{
  "lastPassedPhase": "M7B",
  "currentPhase": "complete",
  "status": "complete",
  "allowedNextAction": "complete",
  "reports": {
    "M7B": { "path": "specs/mobile-app/reports/M7B-GATE-report.md", "verdict": "PASS", "verifiedAt": "…" },
    "M7": { "path": "specs/mobile-app/reports/M7-GATE-report.md", "verdict": "PASS", "verifiedAt": "…" }
  }
}
```

语义：**M7-GATE PASS** = **M7A-GATE PASS** + **M7B-GATE PASS** + **M0–M6 + M7A + M7B 共 9 份** gate 报告链；M7A 先于 M7B，不可并行签核。

任何非 PASS 结果不得推进（**NEEDS_DEVICE_EVIDENCE 亦不得推进**）。`reports.*.verdict == NEEDS_DEVICE_EVIDENCE` 时 `currentPhase` 保持不变。

---

## 5. 输出格式

`pnpm mobile:gate M{n}` 输出必须可被父 agent 直接读：

```text
M{n}-GATE: PASS | FAIL | NEEDS_DEVICE_EVIDENCE | HARD_STOP
CHECKS
- sequence: PASS
- report: PASS
- commands: PASS
- forbidden: PASS
- deviceEvidence: PASS | NEEDS_DEVICE_EVIDENCE
EVIDENCE
- report: specs/mobile-app/reports/M{n}-GATE-report.md
- commands:
  - pnpm check: exit 0
  - ...
NEXT
- allowedNextAction: run_M{n+1}_only
```

失败时：

```text
M{n}-GATE: FAIL
FAILED_CHECK
- commands.m1-eval-capture
LOG_TAIL
...
NEXT
- repair_current_phase_only
```

Hard stop 时：

```text
M{n}-GATE: HARD_STOP
REASON
- long-term provider key found in bundle artifact grep
NEXT_REQUIRED_ACTION
- remove secret, rotate key, re-run scan:secrets + bundle grep
NOTE
- Missing Apple/Google account / EAS only blocks optional release track; report as BLOCKED or WAIVED, not FAIL
```

缺真机证据但机器检查通过时：

```text
M{n}-GATE: NEEDS_DEVICE_EVIDENCE
REASON
- M6 smoke: missing Android dev build §8.1.1 record (device/build/path/result/artifact)
NEXT_REQUIRED_ACTION
- attach dual-device smoke evidence to M6-GATE-report.md and re-run verifier
NOTE
- Not FAIL; cannot PASS until device evidence present; do not advance M(n+1)
```

---

## 6. M0 实施要求

M0 必须创建：

```text
tools/mobile-execution/verify-stage.ts
specs/mobile-app/EXECUTION_STATE.json
specs/mobile-app/reports/
```

并接入：

```json
{
  "scripts": {
    "mobile:gate": "tsx tools/mobile-execution/verify-stage.ts"
  }
}
```

脚本名可调整，但必须在 `M0-GATE-report.md` 中写明最终命令。  

若没有等价 verifier，M0-GATE 失败。

M0 verifier **至少**实现 §3.3.1 全部检查 ID；M1–M7 按阶段递增强制检查（§3.3.2–§3.3.8、§3.4）。

---

## 7. 最小实现优先级

M0 的 verifier 不需要一口气完美。先实现硬门：

```text
P0:
- 顺序锁
- 报告存在且 PASS
- 上一阶段 PASS
- pnpm check
- core boundary
- DoR: guardrails + gate spec 可读（缺 → HARD_STOP）
- M0 文档修订登记表 + KNOWLEDGE_OS_VISION merged/waiver
P1:
- 阶段专项测试 / artifact 路径检查（§3.3.2–§3.3.8）
- M2 §3.4 结构化证据键
- M3 secret scan + bundle grep（M3 前可 stub FAIL，M3 起真实）
- M6 §3.3.7.1 smoke 五字段解析
- M7 九份报告链聚合
```

但从 M2 起，所有 P0/P1 中该阶段声明“必须存在”的检查都必须真实执行。不能永远 placeholder。软件项目最擅长把 placeholder 养成遗产，不要喂它。
