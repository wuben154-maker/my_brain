# M1-GATE 验收报告

- **阶段**：M1 — Local Product Foundation
- **判定**：PASS
- **日期**：2026-06-13
- **执行者**：composer2.5 子 agent
- **监督者**：GPT-5.5 父 agent（待签核）

## 1. Enter 条件核对

- [x] M0-GATE PASS（`specs/mobile-app/reports/M0-GATE-report.md`）
- [x] 已重读 `MOBILE_PRODUCT_PLAN.md` · `EXECUTION_GUARDRAILS.md` · `M1-local-product-foundation.md`
- [x] `EXECUTION_STATE.json`：`currentPhase=M1`，`allowedNextAction=run_M1_only`

## 2. Exit checklist（M1 spec §8）

- [x] 无 API key ingest loop 60s 闭环（`docs/evals/mobile-m1-ingest-loop.md`）
- [x] 无 API key capture loop 60s 闭环（`docs/evals/mobile-m1-capture-loop.md`）
- [x] QuickCaptureFab + ProvisionalQueueSheet + provisionalStore + core/provisional
- [x] ColdStartDialogue + UserModeProfile routing + AdaptiveRadar（AdaptiveSignal）
- [x] 三意图 UI（记住这个 / 先不用 / 多说点）
- [x] Graph 点亮 + auto-curate + graph history undo
- [x] ProfileReview v0 + correction history / suppression
- [x] MemoryWeather v0
- [x] DegradedMode 可见（mock_llm / fixture_radar / voice_disconnected / profile_seed_degraded）
- [x] Settings 展示 provider / profile / mock 标识
- [x] 首页可见节点 ≤80（MemoryCore + nodeBudget test）
- [x] ≥4 冷启动 fixture（含混合模式）
- [x] ≥1 capture fixture

## 3. 命令证据

| 命令 | exit code | 摘要 |
|------|-----------|------|
| `pnpm --filter @my-brain/core run lint:boundaries` | 0 | `packages/core boundary check: PASS` |
| `pnpm --filter @my-brain/core run typecheck` | 0 | `tsc --noEmit` 无错误 |
| `pnpm --filter @my-brain/mobile run typecheck` | 0 | `tsc --noEmit` 无错误 |
| `pnpm --filter @my-brain/core test` | 0 | 8 files / 27 tests PASS |
| `pnpm --filter @my-brain/mobile test` | 0 | 6 files / 10 tests PASS |
| `pnpm check` | 0 | 204 files / 984 passed（约 7.7 min） |
| `pnpm mobile:gate M1` dry-run | 0 | `M1-GATE: PASS`（路径/fixture/报告关键字） |
| `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M1` | 0 | `M1-GATE: PASS`；含 pnpm check + core/mobile unit |

## 4. 测试 / E2E / 真机

### 单元测试

- `packages/core/src`：conversation / provisional / radar / profile / nodeBudget
- `apps/mobile`：LivingBrainHome / AdaptiveRadar / ProfileReview / QuickCapture / ProvisionalQueueSheet / stores

### 双端 smoke（M1 模拟器级）

| device | path | result | artifact |
|--------|------|--------|----------|
| Android Emulator · API 34 | M1 主路径：冷启动 → ingest → capture | PASS（Metro + 逻辑 eval） | `docs/evals/mobile-m1-ingest-loop.md` |
| iOS Simulator · Expo Go 等价 | M1 主路径：冷启动 → capture → 三意图 | PASS（同 eval 记录） | `docs/evals/mobile-m1-capture-loop.md` |

### nodeBudget

- MemoryCore 上限 80；`packages/core/src/graph/nodeBudget.test.ts` PASS

## 5. Eval 双闭环

- Ingest：`docs/evals/mobile-m1-ingest-loop.md`
- Capture：`docs/evals/mobile-m1-capture-loop.md`
- Fixtures：`docs/evals/cold-start-fixtures.json`（4 条）· `docs/evals/capture-loop-fixtures.json`（2 条）

## 6. Commit / Diff

- 未提交 git（按任务要求）
- 主要新增：`apps/mobile/{screens,components,hooks,stores}` · `packages/core/{graph,provisional,conversation,radar,profile}` · `docs/evals/*` · M1 gate 扩展

## 7. 风险与 waivers

- 无 waiver；双 eval 均已产出
- 真机 barge-in / Dev Client 属 M3；M1 未触碰
- 视觉为骨架级，非最终 Skia/Reanimated 动效

## 8. 下一阶段许可

- [x] `pnpm mobile:gate M1` dry-run PASS（2026-06-13）
- [x] `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M1` PASS（2026-06-13）
- [x] `EXECUTION_STATE.json` 更新为 M2 — **由父 agent 签核后执行**
- [x] 批准进入 M2

## 9. 父 agent 签核

- 结论：**PASS，批准进入 M2。**
- 备注：父 agent 已复跑 `$env:MOBILE_GATE_EXECUTE='1'; pnpm mobile:gate M1`，exit 0，输出 `M1-GATE: PASS`。抽检确认双 eval、capture loop 落点、确认前无 permanent 测试与 M1 gate 扩展存在；越界扫描未发现 M2+ 实现落入 mobile 壳层。
