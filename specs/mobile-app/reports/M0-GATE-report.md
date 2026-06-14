# M0-GATE 验收报告

- **阶段**：M0 — App-only 战略改造 + Monorepo 地基
- **判定**：PASS
- **日期**：2026-06-13
- **执行者**：composer2.5 子 agent（M0 返工）
- **监督者**：GPT-5.5 父 agent（签核占位）

## 1. Enter 条件核对

- [x] 无上游阶段（移动系列起点）
- [x] 已重读 `docs/MOBILE_PRODUCT_PLAN.md` §0、§6 阶段 0、§17
- [x] 已重读 `specs/mobile-app/EXECUTION_GUARDRAILS.md` §1–§4、§7
- [x] 已重读 `specs/mobile-app/GATE_VERIFIER_SPEC.md` §3.3.1
- [x] 已重读 `specs/mobile-app/M0-app-only-foundation.md` §8
- [x] `EXECUTION_STATE.json`：`currentPhase=M0`，`allowedNextAction=run_M0_only`

## 2. Exit checklist（M0 spec §8）

- [x] `pnpm-workspace.yaml` 含 `apps/mobile`、`packages/core`
- [x] 两 package 均有真实 `package.json` + `tsconfig.json`
- [x] `packages/core` public `index.ts` + `PUBLIC_API.md`；`lint:boundaries` 已创建
- [x] `apps/mobile` Expo 空壳占位屏（`App.tsx`）
- [x] `apps/mobile/package.json` 声明 `expo` / `react` / `react-native`（Expo SDK 52 + React 18.3.1）
- [x] `pnpm mobile:gate M0` verifier 已存在（`tools/mobile-execution/verify-stage.mjs`）
- [x] `EXECUTION_STATE.json` 符合 schema
- [x] RN/Expo ADR：`docs/adr/0001-react-native-expo-over-flutter.md`
- [x] App IA 文档级：LivingBrainHome / ColdStartDialogue / AdaptiveRadar / QuickCapture / MemoryWeather / Settings·ProfileReview
- [x] **`expo start` 实测**：`expo config` + `expo start --offline` Metro smoke（见 §3、§5）

## 3. 命令证据

| 命令 | exit code | 摘要 |
|------|-----------|------|
| `pnpm install`（workspace，含 mobile Expo 依赖） | 0 | 链接 `apps/mobile` expo/react/react-native；更新 `pnpm-lock.yaml` |
| `pnpm --filter @my-brain/mobile run typecheck` | 0 | `tsc --noEmit` 无错误 |
| `pnpm --filter @my-brain/core run lint:boundaries` | 0 | `packages/core boundary check: PASS` |
| `pnpm --filter @my-brain/core run typecheck` | 0 | `tsc --noEmit` 无错误 |
| `pnpm --filter @my-brain/mobile run expo:config` | 0 | `sdkVersion: 52.0.0`，slug `my-brain`，platforms ios/android |
| `pnpm --filter @my-brain/mobile exec expo start --offline --port 19050`（20s smoke） | 0 | `Starting Metro Bundler` → `Waiting on http://localhost:19050` |
| `pnpm check` | 0 | typecheck + lint + vitest 全绿（191 files / 949 passed，约 11 min） |
| `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M0` | 0 | `M0-GATE: PASS`；含 `m0-mobile-deps`、`m0-expo-config`、`m0-expo-start` |

## 4. 测试 / E2E / 真机

- `packages/core/src/invariants/invariants.test.ts`：2 passed
- `expo start` smoke：**已执行**（Windows 无设备；`--offline --port 19050`，Metro 就绪后手动停止进程）
- M0 §4.4 平台矩阵运行时项：**N/A**（按 spec §0.4）

## 5. 截图 / 录屏

- 无 Expo Go 真机截图（本环境无设备）
- Metro smoke 日志摘要（`expo start --offline --port 19050`）：

```text
Networking has been disabled
Starting project at D:\my_brain\apps\mobile
Starting Metro Bundler
Skipping dependency validation in offline mode
Waiting on http://localhost:19050
```

## 6. Commit / Diff

- 未提交 git（按任务要求）
- lockfile 已更新：`pnpm-lock.yaml`（`pnpm install`）

## 7. 文档修订登记表（§0.5）

| 文档 | Owner | 状态 | 备注 |
|------|-------|------|------|
| `docs/KNOWLEDGE_OS_VISION.md` | composer2.5 | **merged** | 顶部 App-only / User Evolution-first 标注 |
| `AGENTS.md` | composer2.5 | **merged** | 顶部醒目标注 + monorepo 指针 |
| `PRODUCT.md` | composer2.5 | **merged** | 顶部醒目标注；not-store-release-first |
| `docs/ARCHITECTURE.md` | composer2.5 | **merged** | 顶部醒目标注；storage 三端含 mobile 轨说明 |
| `docs/handbook/PROJECT_HANDBOOK.md` | composer2.5 | **merged** | 顶部醒目标注；`apps/mobile` / `packages/core` |
| Storage 三端规则 | composer2.5 | **merged** | 见 `ARCHITECTURE.md` 顶注 + `runbooks/DATA_STORAGE_MAP_AND_BACKUP.md` |
| 产品定位 / 发布策略 | composer2.5 | **merged** | `MOBILE_PRODUCT_PLAN.md` + 四文档顶注 |
| User Evolution-first | composer2.5 | **merged** | `KNOWLEDGE_OS_VISION.md` + `PRODUCT.md` 顶注 |

**KNOWLEDGE_OS_VISION.md**：`merged`（非 waiver）。

## 8. 风险与 waivers

| 风险 | 分类 | 说明 |
|------|------|------|
| 无 Expo Go 真机占位屏截图 | **ACCEPTED（M0）** | Windows CI 以 `expo config` + Metro smoke 为等价证据；真机 UI 留 M1 前人工抽查 |
| `pnpm check` 耗时 | INFO | 全量 vitest ~11 min；结果 exit 0 |

无文档项 waiver。

## 9. 下一阶段许可

- [x] `pnpm mobile:gate M0` 父 agent 签核后 PASS（`MOBILE_GATE_EXECUTE=1` 复验）
- [x] `EXECUTION_STATE.json` 更新为 `allowedNextAction=run_M1_only`（**仅父 agent**）
- [x] 批准进入 M1 — **父 agent 已签核**

## 10. 父 agent 签核

- 结论：**PASS，批准进入 M1。**
- 备注：父 agent 已复跑 `$env:MOBILE_GATE_EXECUTE='1'; pnpm mobile:gate M0`，exit 0，输出 `M0-GATE: PASS`。返工已补齐 Expo 依赖与 Metro smoke；verifier 已收紧 `m0-mobile-deps` / `m0-expo-start`，并为执行命令增加超时与进度日志。
