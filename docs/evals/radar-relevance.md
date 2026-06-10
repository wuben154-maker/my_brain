# Eval — Radar relevance

**Maturity:** **default** (normal launch) with **harness-backed** ranking golden.  
**Not in scope:** Permanent graph writes from `WorldItem` (radar layer stays ephemeral until user ingest).

## What “pass” means

- Default launch (no flag) produces a daily top 3 briefing with explainable `RadarSignal`.
- Ranking golden fixtures cover ≥20 `WorldItem`s across five categories (relevant / weak / noise / duplicate / stale).
- Live source failure degrades to fixture/mock fallback — does **not** switch default entry to legacy RSS flatten.

## Three-path reminder

| Path | Role |
|------|------|
| Radar 默认 | **This eval** — main product entry |
| `?showcase=1` | Fixed demo items — out of scope for ranking golden |
| RSS flatten legacy | Fallback only — must not appear as “default” in docs |

## Verification commands

Run from repository root:

```bash
# Ranking golden fixture coverage (≥20 items, 5 categories)
pnpm test -- radarRankingGolden

# Scoring + selection logic
pnpm test -- scoreWorldItems selectDailyBriefing

# Default Radar launch integration (mock-first, fallback)
pnpm test -- radarLaunch runLaunchSequence

# Daily briefing end-to-end harness
pnpm test -- dailyBriefing

# Source failure → safe fallback (not legacy-as-default)
pnpm test -- sourceFailureRecovery

# Optional: live public source smoke (network; evidence for KP-01)
pnpm test -- liveSourceSmoke
```

## Primary test files

| File | Focus |
|------|-------|
| `src/radar/radarRankingGolden.test.ts` | Golden fixture counts & categories |
| `src/radar/scoreWorldItems.test.ts` | Relevance scoring |
| `src/radar/radarLaunch.integration.test.ts` | Launch → briefing store |
| `src/radar/dailyBriefing.integration.test.ts` | Top 3 + signals integration |
| `src/radar/sourceFailureRecovery.test.ts` | Degraded path |
| `src/lib/runLaunchSequence.test.ts` | V1 launch + Radar default branch |

## Spec cross-links

- [`specs/kos-productization/KP-01-default-radar-launch.md`](../../specs/kos-productization/KP-01-default-radar-launch.md)
- [`specs/KOS-B2-radar-signal.md`](../../specs/KOS-B2-radar-signal.md)
- [`specs/KOS-B3-daily-briefing.md`](../../specs/KOS-B3-daily-briefing.md)
