# M3-GATE 验收报告

- **阶段**：M3 — 真实语音主路径 + Token Exchange
- **判定**：NEEDS_DEVICE_EVIDENCE（机器检查通过；缺双端真机 barge-in 录屏；**非 FULL PASS**；**不得批准 M4**）
- **日期**：2026-06-14
- **执行者**：composer2.5 子 agent
- **监督者**：GPT-5.5 父 agent（待签核）

## 1. Enter 条件核对

- [x] M2-GATE PASS（`specs/mobile-app/reports/M2-GATE-report.md`）
- [x] 已重读 `MOBILE_PRODUCT_PLAN.md` · `EXECUTION_GUARDRAILS.md` · `M3-realtime-voice-and-token-exchange.md`
- [x] `EXECUTION_STATE.json`：`currentPhase=M3`，`allowedNextAction=run_M3_only`（本子 agent **未修改**）
- [x] ADR 落盘：`docs/adr/0002-mobile-token-exchange.md`、`docs/adr/0003-rn-native-voice-transport-ws-headers.md`

## 2. Exit checklist（M3 spec §8）

- [ ] 插话时立即停止播放并进入聆听（**双端真机**）— mock 单测 PASS；真机 → **NEEDS_DEVICE_EVIDENCE**
- [x] 语音与文字三意图行为一致（`packages/core/src/voice/ingestIntent.test.ts`）
- [x] Provider 失败不污染图谱、不阻塞启动（VoiceSession transport/token 测试）
- [x] Token 过期/交换失败可文字闭环（mock exchange + degraded）
- [ ] §5.1 语音矩阵全部真机证据 — 见 `docs/evals/m3-voice-matrix.md`（机器模拟 PASS，真机待补）
- [x] ADR：RN 原生 WS Header 方案已落盘
- [x] `pnpm check` 绿（exit 0，1039 tests）

### 8.2 Secret scan

- [x] `pnpm run scan:secrets` exit 0 → `specs/mobile-app/reports/artifacts/M3-scan-secrets.log`
- [x] bundle artifact grep exit 0 → `specs/mobile-app/reports/artifacts/M3-bundle-secret-grep.log`（3 artifacts scanned，无长期密钥字面量）
- [x] mobile/core 无新增裸密钥读取；voice 配置经 token exchange + secure-store 适配器

### 8.3 DegradedMode

- [x] Settings `voice_disconnected` 可见（`settings-voice-disconnected` testId）
- [x] ≥2 `degradedVoiceEvidence` 场景（见 §4）

## 3. 命令证据

| 命令 | exit code | 摘要 |
|------|-----------|------|
| `pnpm --filter @my-brain/core test -- ingestIntent` | 0 | 15 tests PASS（含 `ingestIntent.test.ts`） |
| `pnpm --filter @my-brain/mobile test -- VoiceSession mockRealtime audioFocus audioSession Settings tokenExchange` | 0 | 58 tests PASS（含新增 voice 模块 12 tests） |
| `pnpm run scan:secrets` | 0 | 无高置信密钥值；log 已写入 artifacts |
| `pnpm run scan:bundle-secrets` | 0 | 3 bundle artifacts scanned，0 hits |
| `pnpm check` | 0 | typecheck + lint + 1039 tests 全绿 |

## 4. degradedVoiceEvidence

### 场景 A — TokenExchangeError

```yaml
degradedVoiceEvidence:
  scenario: TokenExchangeError
  settingsPanel: provider-status-voice disconnected + settings-voice-disconnected
  banner: shown
  textIntentsStillWork: pass
  timestamp: 2026-06-14T10:14:50Z
  deviceOrSimulator: { platform: vitest, model: VoiceSession.test.tsx }
```

### 场景 B — RealtimeVoiceTransportError

```yaml
degradedVoiceEvidence:
  scenario: RealtimeVoiceTransportError
  settingsPanel: settings-voice-disconnected 文案可见
  banner: shown
  textIntentsStillWork: pass
  timestamp: 2026-06-14T10:14:50Z
  deviceOrSimulator: { platform: vitest, model: Settings.test.tsx }
```

详表：`docs/evals/m3-voice-degraded.md`

## 5. 测试 / barge-in / 真机

| 项 | 结果 |
|----|------|
| mock barge-in（`mockRealtime.test.ts` + `VoiceSession.test.tsx`） | PASS — interrupt 清空队列，FSM → listening |
| 双端真机 barge-in P50 | **NEEDS_DEVICE_EVIDENCE** — 无录屏/设备型号证据 |
| 语音矩阵 | `docs/evals/m3-voice-matrix.md` — 机器模拟 PASS，真机列待补 |

## 6. ADR / Eval / Artifact 路径

| 产物 | 路径 |
|------|------|
| Token exchange ADR | `docs/adr/0002-mobile-token-exchange.md` |
| RN WS Header ADR | `docs/adr/0003-rn-native-voice-transport-ws-headers.md` |
| Voice intent fixtures | `docs/evals/voice-intent-fixtures.json` |
| 降级证据 | `docs/evals/m3-voice-degraded.md` |
| 双端矩阵 | `docs/evals/m3-voice-matrix.md` |
| Secret scan log | `specs/mobile-app/reports/artifacts/M3-scan-secrets.log` |
| Bundle grep log | `specs/mobile-app/reports/artifacts/M3-bundle-secret-grep.log` |

## 7. Commit / Diff

- 未提交 git（按任务要求）
- 关键变更文件：

- `packages/core/src/voice/ingestIntent.ts` + `.test.ts`
- `apps/mobile/voice/*`（FSM、mock transport、token exchange、audioFocus/audioSession）
- `apps/mobile/screens/LivingBrainHome.tsx`（Settings `voice_disconnected`）
- `tools/scan-secrets.mjs`、`tools/scan-bundle-secrets.mjs`
- `package.json`（`scan:secrets`、`scan:bundle-secrets` scripts）

## 8. 风险与 waivers

- **mock-first**：未声称 live Realtime；token exchange 默认 mock。
- **bundle grep 边界**：扫描 `apps/mobile/build` 现有 3 个 artifact（HBC + metadata）；非完整 native release 产物。
- **真机 barge-in**：gate 判定 **NEEDS_DEVICE_EVIDENCE**，父 agent 签核前不得推进 M4。

## 9. 下一阶段许可

- [x] `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M3` 已执行；结果：**NEEDS_DEVICE_EVIDENCE**（exit 2）
- [x] `EXECUTION_STATE.json` 保持 `currentPhase=M3` / `lastPassedPhase=M2` / `allowedNextAction=run_M3_only` / `hardStop=null`
- [x] **拒绝进入 M4 FULL PASS** — 本报告判定非 PASS；下一步唯一允许动作仍为补 M3 真机证据并复验 M3

## 10. 父 agent 签核

- 结论：**NEEDS_DEVICE_EVIDENCE**。父 agent 已复查 diff、报告与关键实现；M3 mock-first / diagnostic-first 最小闭环已完成，但缺双端真机 barge-in 证据，不得推进 M4。
- 命令结果：`pnpm --filter @my-brain/core test -- ingestIntent` exit 0；`pnpm --filter @my-brain/mobile test -- VoiceSession mockRealtime audioFocus audioSession Settings tokenExchange` exit 0；`pnpm run scan:secrets` exit 0；`pnpm run scan:bundle-secrets` exit 0；`pnpm check` exit 0；`MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M3` exit 2 / `M3-GATE: NEEDS_DEVICE_EVIDENCE`。
- 备注：未触碰 M4+ 实现范围；未提交 git；`EXECUTION_STATE.json` 未推进。

## 11. 阶段运行摘要（父 agent）

- 当前阶段：M3 — 真实语音主路径 + Token Exchange。
- 已完成事项：ADR、core 三意图解析、mobile voice FSM/mock transport/token exchange、AudioFocus/AudioSession 诊断抽象、Settings `voice_disconnected`、degradedVoiceEvidence、secret scan 与 bundle grep artifact。
- 修改文件：见 §7；另包含 `docs/adr/0002-mobile-token-exchange.md`、`docs/adr/0003-rn-native-voice-transport-ws-headers.md`、`docs/evals/m3-voice-degraded.md`、`docs/evals/m3-voice-matrix.md`、`docs/evals/voice-intent-fixtures.json`。
- gate 结果：**NEEDS_DEVICE_EVIDENCE**，不是 FAIL，也不是 PASS。
- 当前 `EXECUTION_STATE.json` 应有值：`currentPhase=M3`、`status=not_started`、`lastPassedPhase=M2`、`allowedNextAction=run_M3_only`、`hardStop=null`。
- 下一步唯一允许动作：采集 M3 双端 Dev Client / native build 真机 barge-in 与语音矩阵证据，写入 `docs/evals/m3-voice-matrix.md` 后复跑 `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M3`。
- 用户是否需要手动配合：**需要**。需要至少 iOS + Android 真机语音插话录屏/设备型号/OS/build/time/P50 停播延迟证据。

## 12. M4 mock/prep 摘要（M3 gate 未解锁）

- 当前阶段锁：`EXECUTION_STATE.json` 仍应保持 `currentPhase=M3`、`lastPassedPhase=M2`、`allowedNextAction=run_M3_only`、`hardStop=null`。
- 用户指令：先 mock，继续执行。父 agent 按护栏仅允许推进 **M2 后可并行的 M4 文字/分享捕获 mock/prep**，不得签核 M4-GATE FULL PASS。
- 已完成事项：`UrlFetchGuard` SSRF allowlist、share/OCR/sync ingest gate、provisional queue FSM 测试、source type 扩展、mobile mock link capture、队列 UI 安全提示、M4 local E2E skeleton。
- 修改文件：`packages/core/src/provisional/urlFetchGuard.ts`、`ingestGate.ts`、相关 `*.test.ts`；`apps/mobile/capture/*`；`apps/mobile/components/QuickCaptureFab.tsx`、`ProvisionalQueueSheet.tsx`；`apps/mobile/stores/provisionalStore.ts`；`docs/evals/m4-mock-prep.md`。
- 父 agent 复查：未创建 `specs/mobile-app/reports/M4-GATE-report.md`；未修改 `EXECUTION_STATE.json`；未触碰 M5+；语音笔记路径保持 disabled / `voice_disconnected`。
- 测试结果：`pnpm --filter @my-brain/core test -- ssrf urlFetchGuard ingestGate provisionalQueueFsm sourceTypes` exit 0；`pnpm --filter @my-brain/mobile test -- provisionalQueue QuickCapture` exit 0。
- 全量检查：子 agent 报告 `pnpm check` exit 0；父 agent 也启动了 `pnpm check`，但该命令被手动转入后台，当前不作为最终父侧证据等待。
- gate 结果：M3 仍为 **NEEDS_DEVICE_EVIDENCE**；M4 未签核、未 PASS。
- 下一步唯一允许动作：继续补 M3 真机证据；若继续 mock，可只做不会要求 M4 FULL PASS 的本地预备工作，并持续保持 state 锁。
- 用户是否需要手动配合：M3 仍需要 iOS + Android 真机 barge-in 证据；M4 FULL PASS 之后还需要 Android intent / iOS Share Extension 真机证据。

## 13. M4 mock/prep 第二批摘要（share payload / OCR）

- 当前阶段锁：`EXECUTION_STATE.json` 仍应保持 `currentPhase=M3`、`lastPassedPhase=M2`、`allowedNextAction=run_M3_only`、`hardStop=null`。
- 已完成事项：core share payload schema/validator、OCR mock boundary、mobile mock share intake、image share intake、share payload fixtures、local E2E skeleton `share-payload-mock.yaml`。
- 修改文件：`packages/core/src/provisional/sharePayload.ts`、`ocrBoundary.ts`、相关测试；`apps/mobile/capture/shareIntake.ts`、`shareImageIntake.ts`、`shareIntake.test.ts`；`docs/evals/m4-share-payload-fixtures.json`；`docs/evals/m4-mock-prep.md`。
- 父 agent 复查：未创建 `specs/mobile-app/reports/M4-GATE-report.md`；未修改 `EXECUTION_STATE.json`；未触碰 M5+；share/OCR intake 只生成 provisional；voice note 仍 disabled。
- 测试结果：`pnpm --filter @my-brain/core test -- sharePayload ocrBoundary ingestGate sourceTypes` exit 0；`pnpm --filter @my-brain/mobile test -- shareIntake provisionalQueue QuickCapture` exit 0。
- 全量检查：子 agent 尝试 `pnpm check` 但未完成；父 agent 本轮未重复全量等待，仅以定向测试作为 M4 mock/prep 证据。
- gate 结果：M3 仍为 **NEEDS_DEVICE_EVIDENCE**；M4 仍未签核、未 PASS。
- 下一步唯一允许动作：补 M3 真机 barge-in 证据并复验 M3；或继续做不要求 M4 FULL PASS 的本地 mock/prep，state 必须继续锁在 M3。
- 用户是否需要手动配合：M3 需要 iOS + Android 真机 barge-in；M4 FULL PASS 需要 Android intent 与 iOS Share Extension 真机证据。

## 14. M5 执行判定（未派发）

- 用户请求：判断是否可以先 mock 继续执行 M5，若可以则派 composer2.5。
- 判定：**不可以派发 M5**。`EXECUTION_STATE.json` 当前仍为 `currentPhase=M3` / `allowedNextAction=run_M3_only`；`M3-GATE` 仍是 `NEEDS_DEVICE_EVIDENCE`；`M4-GATE` 尚未 FULL PASS。
- 依据：`M4-quick-capture-and-provisional-queue.md` §9 写明 **解锁 M5 = M4-GATE FULL PASS**；`M5-signature-memory-experiences.md` §9 / guardrails M5 DoR 写明 **M5 依赖 M4 PASS**。M5 不存在像 M4 “M2 后可并行文字/分享路径”的例外。
- 父 agent 动作：未启动 M5 子 agent，未创建 M5 报告，未修改 `EXECUTION_STATE.json`。
- 下一步唯一安全动作：继续补 M3 真机证据，或继续做 M4 范围内不要求 FULL PASS 的本地 mock/prep；不得开始 M5。

## 15. M3 真机诊断 UI（barge-in 采证入口）

- **状态**：Settings 已集成 `apps/mobile/components/M3VoiceDiagnosticsPanel.tsx`（mock transport 横幅明示；**不等于 live Realtime provider**）。**M3-GATE 判定不变：NEEDS_DEVICE_EVIDENCE**（非 PASS）。
- **入口**：首页 `···` → 设置 → 「M3 语音插话诊断（Dev Client）」。
- **能力**：Platform / OS Version / Build（无 native build 时 `dev/mock`）、FSM、播放中、连接 / 模拟播报 / 插话 / 模拟断连、stopLatencyMs（mock 近似）、可分享证据 YAML 模板。
- **修改文件**：`M3VoiceDiagnosticsPanel.tsx`、`.test.tsx`；`LivingBrainHome.tsx`（Settings 引入）；`VoiceSession.ts`（暴露 `simulateTransportError`）；`docs/evals/m3-voice-matrix.md` 真机补录指引。
- **测试（已复跑）**：`pnpm --filter @my-brain/mobile test -- Settings M3Voice VoiceSession mockRealtime LivingBrainHome` → exit 0（76 tests PASS，含 M3 诊断面板 + Settings 入口 + 既有 `voice_disconnected`）
- **下一步**：用户**重装** iOS + Android dev/preview 包 → 按矩阵 §真机补录指引录屏 → 双端证据填回 `docs/evals/m3-voice-matrix.md` → 父 agent 复验 `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M3`。
