# KOS Agent Team Runbook

> Execution ledger for the KP productization harness. The main agent owns gate
> decisions; child agents and reviewers must report evidence back into this file.

```json
{
  "active_spec": "KP-15-controlled-action-agent",
  "active_phase": "Phase 8 complete",
  "status": "kp00_kp15_code_complete_kp09_conditional_fail_dogfood",
  "owner_agents": {
    "executor": "b9115868-fbf9-4b2b-8461-b589709c4ac7",
    "acceptance_reviewer": "22cd5670-fb9b-43df-bfca-545290071c19",
    "direction_guardian": "502d79bd-234f-46a4-973c-83b580c93ba7"
  },
  "commands_run": [
    "Full vitest --maxWorkers=1: 884 passed | 1 skipped (liveSourceSmoke env-gated)",
    "pnpm typecheck + pnpm lint: PASS",
    "KP-09 gate bundle: 143/143 PASS",
    "phase15 + Phase 6-8 scoped: 71/71 PASS"
  ],
  "gate_evidence": [
    "KP-00 PASS — UI contract + CompanionShell",
    "KP-01 PASS — default Radar launch",
    "KP-02 PASS — RadarCompanionCard in companion shell",
    "KP-03 PASS — Weekly Review mainflow + graph citations",
    "KP-04 PASS — briefingFeedbackRepo + feedbackReplay",
    "KP-05 PASS — profile teaching loop + feedback UI",
    "KP-06 PASS — docs/evals + maturity口径",
    "KP-07 PASS — storageTransaction + undoRoundTrip",
    "KP-08 PASS — Project node minimal",
    "KP-09 CONDITIONAL — automated PASS; dogfood pending_human (P1-QUALITY-01)",
    "KP-10 PASS — Source node",
    "KP-11 PASS — Decision node",
    "KP-12 PASS — Question node",
    "KP-13 PASS — Skill node",
    "KP-14 PASS — provisional ingest boundary",
    "KP-15 PASS — controlled action permissions + audit"
  ],
  "p0_p1_findings": [
    {
      "severity": "P1",
      "finding": "KP-09 dogfood 连续 ≥3 天人工签收未完成",
      "status": "open",
      "id": "P1-QUALITY-01"
    },
    {
      "severity": "P2",
      "finding": "ProvisionalInbox / ActionConfirm UI 未做（测试已覆盖边界）",
      "status": "open"
    },
    {
      "severity": "P2",
      "finding": "visual:loop --companion 未跑",
      "status": "open"
    }
  ],
  "next_spec": "operator-dogfood-signoff-then-phase6-8-spec-verifier"
}
```

## Phase 1–5 摘要

| KP | 状态 | 关键产物 |
|----|------|----------|
| KP-00 | PASS | `docs/UI_CONTRACT.md`, `CompanionShell` |
| KP-01 | PASS | 默认 Radar launch, live smoke evidence |
| KP-02 | PASS | `RadarCompanionCard`, auto-open radar slot |
| KP-03 | PASS | `WeeklyReviewCompanionCard`, curation→review CTA |
| KP-04 | PASS | `briefingFeedbackRepo`, `feedbackReplay` |
| KP-05 | PASS | `profileRerank`, feedback chips, teachingDepth integration |
| KP-06 | PASS | `docs/evals/*`, 成熟度口径 |
| KP-07 | PASS | `storage/transaction.ts`, schema migration framework |
| KP-08 | PASS | `ProjectNode`, `used_in` edges |
| KP-09 | **CONDITIONAL** | `phase15MainLoop.e2e`, `phase15Gate.test`; dogfood 待人工 |

## Phase 6–8 摘要

| KP | 状态 | 关键产物 |
|----|------|----------|
| KP-10 | PASS | `SourceNode`, schema v3 |
| KP-11 | PASS | `DecisionNode`, schema v4 |
| KP-12 | PASS | `QuestionNode`, schema v5 |
| KP-13 | PASS | `SkillNode`, schema v6 |
| KP-14 | PASS | provisional store + promote gate |
| KP-15 | PASS | `actionPermission`, dry-run executor, audit log |

## 验证命令（Windows 稳定）

```powershell
pnpm typecheck
pnpm lint
pnpm test
# vitest.config.ts 已设 maxWorkers: 1，避免并行 OOM
```

## 唯一阻塞正式 KP-09 PASS 的项

填写 [`docs/evidence/KP-09-phase-1-5-gate.md`](./evidence/KP-09-phase-1-5-gate.md) 中 **Dogfood 三节表格** 并签收。
