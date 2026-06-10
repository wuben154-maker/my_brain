# KP-09 Phase 1–5 Acceptance Gate Evidence

> 总验收门：默认主路径 E2E + showcase E2E + 边界 + KP-00..08 测试文件存在性 + dogfood 质量（人工）。

## Gate command bundle

```bash
pnpm check
pnpm test -- phase15 companion showcaseCoreLoop brainMcpForbidden productInvariants graphMutations
```

## Automated checklist

| Item | Evidence | Status | Date (UTC) |
|------|----------|--------|------------|
| `pnpm check` (typecheck + lint + test) | `pnpm vitest run --maxWorkers=1` → **884 passed \| 1 skipped**; typecheck + lint PASS | **PASS** | 2026-06-10 |
| Default main-path E2E (`phase15MainLoop`) | `src/e2e/phase15MainLoop.e2e.test.ts` | **PASS** (1/1) | 2026-06-10 |
| Companion E2E smoke | `src/e2e/companion.e2e.test.ts` | **PASS** (18/18) | 2026-06-10 |
| Showcase E2E (`?showcase=1` harness) | `showcaseCoreLoop.integration` + `companion.e2e` showcase | **PASS** (2/2) | 2026-06-10 |
| KP-00..08 verification files exist | `src/radar/phase15Gate.test.ts` | **PASS** (39/39) | 2026-06-10 |
| WorldItem → graph only via ingest | `productInvariants` tests | **PASS** (47/47 + E5 2/2) | 2026-06-10 |
| Brain MCP write forbidden | `src/mcp/brainMcpForbidden.test.ts` | **PASS** (6/6) | 2026-06-10 |
| CognitiveAction draft-only | `draftOnlyBoundary` (via phase15Gate KP-03 registry) | registry PASS | 2026-06-10 |
| Memory does not write graph/profile | `companion.e2e` memory boundary + `productInvariants` | **PASS** | 2026-06-10 |
| KP-07 H5 storage-transaction gate | `graphMutations` (14/14) + registry | **PASS** | 2026-06-10 |
| KP-01 live source smoke | [`KP-01-live-source-smoke.md`](./KP-01-live-source-smoke.md) | attached | 2026-06-10 |
| UI contract (no dashboard regression) | phase15Gate registry KP-00 | registry PASS | 2026-06-10 |
| Docs maturity口径 (KP-06) | phase15Gate registry KP-06 | registry PASS | 2026-06-10 |

## Default main-path E2E chain (six steps)

| Step | Assertion | Test |
|------|-----------|------|
| Radar top 3 | `newsQueue.length === 3`, golden ids | `phase15MainLoop` |
| RadarSignal visible | each briefing item `signals.length >= 1` + explanation | `phase15MainLoop` |
| Voice ingest confirm | `parseIngestCommand("入")` → ingest + node persisted | `phase15MainLoop` |
| auto-curate | `curationEntries.length > 0` + `graph_history` rows | `phase15MainLoop` |
| undo | `graphHistoryStore.undo` restores `before` snapshot | `phase15MainLoop` |
| Weekly Review cites history | `buildWeeklyBrainReview` citations ⊆ session history ids | `phase15MainLoop` |

## Showcase E2E reference

- Primary: `src/showcase/showcaseCoreLoop.integration.test.ts` (`describe("showcaseCoreLoop integration")`)
- Secondary: `src/e2e/companion.e2e.test.ts` (`describe("companion e2e showcase core loop")`)

## Dogfood quality sign-off (≥3 consecutive days)

> **Status: `pending_human`** — 连续 ≥3 天真实使用，每天 top3 中至少 1 条愿意入库或标记「有用」。未填 = 质量 P1 → gate FAIL。

| Day | Date | Top3 useful/ingest-worthy item | Notes | Sign-off |
|-----|------|--------------------------------|-------|----------|
| 1 | _YYYY-MM-DD_ | _title or worldItem id_ | _optional_ | ☐ |
| 2 | _YYYY-MM-DD_ | _title or worldItem id_ | _optional_ | ☐ |
| 3 | _YYYY-MM-DD_ | _title or worldItem id_ | _optional_ | ☐ |

**Reviewer:** _name_  
**Signed at (UTC):** _timestamp_

## Test run log

```
pnpm test -- phase15 companion showcaseCoreLoop brainMcpForbidden productInvariants graphMutations
# exit code: 0
# date: 2026-06-10 (UTC)
# Test Files  13 passed (13)
# Tests       143 passed (143)
```

## P0 / P1 tracker

| ID | Severity | Description | Owner | Status |
|----|----------|-------------|-------|--------|
| P1-QUALITY-01 | P1 | Dogfood 连续 ≥3 天人工签收未完成（`pending_human`） | human | open |
| P1-CHECK-01 | P1 | 完整 `pnpm check` | agent | **resolved** (884/885 + typecheck/lint) |

## Gate verdict

| Verdict | Condition |
|---------|-----------|
| **PASS** | All automated items green + dogfood 3-day sign-off + P0/P1 = 0 |
| **FAIL** | Any automated failure, missing verification test file, dogfood pending, or open P0/P1 |

**Current verdict:** **FAIL** — gate test bundle 143/143 绿，但 dogfood 人工签收与完整 `pnpm check` 未闭合（P1×2）。
