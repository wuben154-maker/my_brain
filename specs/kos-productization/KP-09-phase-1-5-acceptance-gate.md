# KP-09 — Phase 1–5 总体验收门（`phase-1-5-gate`）

- **阶段：** KP Gate · **状态：** planned
- **上游：** KP-00–KP-08（含 KP-07 H5-storage-transactions gate） · **下游：** KP-10–KP-15
- **依赖 / 前置里程碑：** 全部 Phase 0–5 spec 各自 PASS
- **可并行性：** 无；**FAIL 则停止 Controlled Autonomy（KP-10+）**

## 定位

确认项目已从「mock/harness 宽覆盖原型」收束为 **可信主闭环**，再进入高风险 Controlled Autonomy（schema 扩展、provisional ingest、controlled action）。本 spec 是 **唯一** Phase 1–5 总 gate。

## 目标

1. 用 `spec-verifier` 编排总验，范围 Phase 0–5（含 4.5 H5-storage-transactions gate）。
2. 客观闸：`pnpm check`；必要时 build、默认启动 smoke、showcase smoke、companion visual smoke。
3. **主路径 E2E（必须）** 无 flag 完整链：
   - Radar top 3 可见
   - RadarSignal 解释可见
   - 用户语音确认入库
   - auto-curate 执行
   - undo 可恢复
   - Weekly Review 引用真实 graph history
4. **showcase E2E：** `?showcase=1` 完整可运行。
5. **边界验收：** WorldItem 不直写图谱；MCP 只读；Action draft-only；Memory 不写图谱。
6. **文档验收：** README、ARCHITECTURE、PROJECT_STATUS、specs/README 成熟度与默认体验无冲突。
7. **dogfood 质量验收**：连续 ≥3 天真实使用，每天 top3 中至少 1 条用户愿意入库或标记「有用」；达不到视为质量 P1，gate FAIL（允许人工记录证据）。
8. P0/P1 = 0 方可 PASS。

## 非目标

- 不验收 Phase 6–8（Source、provisional、action execute）——除非误合并。
- 不在 FAIL 时启动 KP-10。
- 不用新增节点类型掩盖主闭环缺陷。

## 涉及文件/模块

```
.cursor/skills/spec-verifier/              # 编排（若项目内）
specs/kos-productization/KP-00..08.md     # 范围定义
README.md docs/ARCHITECTURE.md docs/PROJECT_STATUS.md
src/e2e/companion.e2e.test.ts             # 扩展：默认主路径 E2E
src/showcase/showcaseCoreLoop.integration.test.ts  # showcase E2E（现有）
pnpm check / pnpm visual:loop --companion
```

## 用户可见流程或数据流

```
默认启动（无 flag）
  → top3 + signals（KP-01/02）
  → 语音「入」→ 节点点亮（V3）
  → auto-curate → history（V4）
  → undo 恢复（V4/KOS-A3）
  → Weekly Review 显示真实 change（KP-03）
  → Action 仅 draft（KOS-E1）

?showcase=1 → A1/A2 全流程仍绿

FAIL → 停止 KP-10–15，修复主路径/边界/H5 gate/文档
```

## 验收清单

- [ ] `spec-verifier`（或等价 checklist）Phase 0–5 全项 PASS。
- [ ] `pnpm check` 全绿。
- [ ] **默认 E2E** 六步链人工或 automated 全过。
- [ ] **showcase E2E** 全过。
- [ ] WorldItem → 图谱：仅用户确认 ingest 路径。
- [ ] Brain MCP write tools 测试 FAIL if invoked。
- [ ] CognitiveAction 无默认外部 execute。
- [ ] MemoryProvider 不写 graph/profile 测试绿。
- [ ] KP-07 H5-storage-transactions gate 证据 attached（test 名 + 日期）。
- [ ] **live source smoke 证据**已附（KP-01；日志/截图/日期）。
- [ ] **dogfood 质量**：连续 ≥3 天真实使用，每天 top3 至少 1 条愿意入库或标记「有用」；附人工证据；未达标 = 质量 P1 → FAIL。
- [ ] **验证测试文件存在**：逐一核对 KP-00–08 所列验证命令对应的测试文件真实存在且含 spec 声明断言；Vitest 过滤无匹配 = gate FAIL（见 kos-productization README「验证命令约定」）。
- [ ] UI contract 未破坏：无 dashboard 回归。
- [ ] 文档三路径口径一致（KP-06）。
- [ ] P0/P1 问题 = 0。

## 不变量与权限边界

- 总 gate **不降低** AGENTS.md 八条不变量。
- FAIL 时禁止「用 KP-10 provisional 绕过主闭环」。
- showcase 不得替代默认 E2E PASS 证据。

## 测试 / 验证命令

```bash
pnpm check
pnpm test -- companion showcaseCoreLoop brainMcpForbidden productInvariants graphMutations
pnpm visual:loop --companion
pnpm tauri build                    # 可选高风险阶段
# spec-verifier 编排（项目脚本）
```

## 风险与 Stop condition

| 风险 | 对策 |
|------|------|
| spec ✅ 但 E2E 不过 | 本 gate 以 E2E 为准 |
| 跳过 showcase | 双路径必测 |
| H5 gate 假 PASS | 必须附 KP-07 test 证据 |
| dogfood 质量未达标 | 连续 3 天无「愿意入库/有用」→ 质量 P1 FAIL |
| 测试名无匹配文件 | 按「验证命令约定」视为 FAIL |

**Stop condition：** 任一 P0/P1、默认 E2E 失败、H5 gate 未 PASS、dogfood 质量未达标、验证测试文件缺失、文档冲突 → **停止 KP-10–15**；先修主闭环。

## Skill 使用要求

- **`spec-verifier`** 编排总验。
- **`spec-acceptance-review`** 各 Phase lite 汇总。
- UI 回归：`design-review` spot-check + `qa` on E2E path。

---

## Harness 验收协议

### Scope

- **做：** Phase 0–5 总验、默认+showcase E2E、边界、文档、H5 gate 证据、live source smoke 证据、dogfood 质量、KP-00–08 测试文件存在性核对。
- **不做：** Phase 6–8 功能验收（仅确保未误开）。

### Input fixtures

- Mock-first 默认启动
- `?showcase=1`
- Harness graph with ingest+curation history

### User actions

1. 无 flag：top3 → 语音入库 → 等 auto-curate → undo → Weekly Review。
2. showcase：A1 script 全流程。
3. 跑 MCP boundary + draft-only tests。
4. **dogfood 质量**：连续 ≥3 天真实使用，记录每天 top3 中至少 1 条愿意入库或标记「有用」。
5. 核对 KP-00–08 验证测试文件存在（见「验证命令约定」）。

### Expected observations

| 步骤 | 期望 |
|------|------|
| Radar | 3 + signals |
| ingest | 节点出现 |
| curation | history 有 op |
| undo | 图恢复 |
| Review | cites real change |
| showcase | 与 golden 一致 |

### Assertions

```text
Given KP-00..08 merged
When default main loop E2E runs without flag
Then all six steps pass
When ?showcase=1 E2E runs
Then showcase golden pass
And WorldItem never writes graph directly
And MCP write blocked
And actions draft-only
And KP-07 tests green
And live source smoke evidence attached
And dogfood quality: >=3 consecutive days with >=1 useful/ingest-worthy item per day in top3
And each KP-00..08 verification test file exists (no passWithNoTests silent pass)
When any P0/P1 or quality P1 or missing test files
Then gate FAIL and KP-10 blocked
```

### Forbidden behaviors

- 无默认 E2E 仅 showcase PASS 即放行。
- FAIL 仍合并 KP-10+。
- legacy flatten 作为默认 E2E 路径。

### Failure recovery

| 失败 | 行为 |
|------|------|
| E2E 某步失败 | 定位 KP-xx spec；不 skip gate |
| 文档冲突 | KP-06 修复后再验 |

### Verification command

```bash
pnpm check
pnpm test -- companion showcaseCoreLoop brainMcpForbidden productInvariants graphMutations
pnpm visual:loop --companion
```
