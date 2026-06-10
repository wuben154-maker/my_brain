# Evals & maturity index

> **Purpose:** Avoid reading “all specs ✅” as “production-ready Knowledge OS.” This directory maps **product claims** to **existing Vitest harness commands** so reviewers can re-run evidence without guessing.

## Maturity labels (used across README / ARCHITECTURE / PROJECT_STATUS)

| Label | Meaning | Examples |
|-------|---------|----------|
| **default** | Normal launch (`pnpm dev`, no query flag). Mock-first, user-visible main path. | Radar top 3 briefing, voice ingest gate, auto-curate + undo, Weekly Review entry |
| **harness-backed** | Logic + regression tests exist; UI or live API may still be mock/partial. | Ranking golden, profile rerank, learning trace, CognitiveAction drafts |
| **experimental** | Opt-in, fallback-only, or Phase 6–8 / not default promise. | `?showcase=1`, RSS flatten legacy fallback, controlled external writes (KP-15), Interview Mode |

**Rule:** README and root docs **only promise default** capabilities. Harness-backed items may be demoable in dev; experimental items must be labeled explicitly.

## Default experience — three paths (canonical)

| Path | Trigger | Maturity | Notes |
|------|---------|----------|-------|
| **Radar 默认** | No query flag / normal launch | **default** | Mock-first top 3 + `RadarSignal`; live sources enhance; fixture fallback on failure |
| **Showcase 演示** | `?showcase=1` | **experimental** (demo) | Fixed curated script for interviews/screenshots — **not** the default product path |
| **RSS flatten legacy** | Internal fallback when Radar/source fails | **experimental** (fallback) | Degraded briefing only — **never** document as main entry |

Same wording appears in [`README.md`](../../README.md), [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md), [`docs/UI_CONTRACT.md`](../UI_CONTRACT.md), and [`specs/kos-productization/README.md`](../../specs/kos-productization/README.md).

## Eval categories

| Category | Doc | What it checks |
|----------|-----|----------------|
| Radar relevance | [`radar-relevance.md`](./radar-relevance.md) | Top-3 ranking, RadarSignal, launch path, source failure recovery |
| Ingest quality | [`ingest-quality.md`](./ingest-quality.md) | Launch sequence, live/smoke sources, user-gated ingest |
| Curation undo | [`curation-undo.md`](./curation-undo.md) | Post-ingest auto-curate, reason codes, graph history undo |
| Profile growth | [`profile-growth.md`](./profile-growth.md) | Learning trace, profile correction, feedback → rerank |
| Action usefulness | [`action-usefulness.md`](./action-usefulness.md) | CognitiveAction drafts, Weekly Review mainflow, draft-only boundary |

## Quick verification (docs surface)

```bash
pnpm test -- docsSurface docsLinks keywords
pnpm check
```

## Related docs

- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — trust boundaries + maturity map
- [`docs/PROJECT_STATUS.md`](../PROJECT_STATUS.md) — implementation gaps vs PRODUCT.md
- [`specs/kos-productization/KP-06-evals-docs.md`](../../specs/kos-productization/KP-06-evals-docs.md) — spec contract
- [`specs/README.md`](../../specs/README.md) — milestone index (spec ✅ ≠ default maturity)
