# Eval — Ingest quality

**Maturity:** **default** user-gated create (V3); **harness-backed** provenance and launch wiring.

## What “pass” means

- New permanent graph nodes only after explicit ingest confirmation (“入 / 不要 / 讲细点”).
- Launch sequence reaches companion phase with briefing data on the default Radar path.
- Live source smoke (when run) proves public fetch path works; failures use fixture fallback without claiming live success.

## Three-path reminder

| Path | Ingest behavior |
|------|-----------------|
| Radar 默认 | Real ingest gate on briefing items from Radar top 3 |
| `?showcase=1` | Fixed `showcase-brief-3` → `showcase-ingest-graphiti` demo |
| RSS flatten legacy | May surface flattened queue on failure — still requires V3 gate for create |

## Verification commands

```bash
# Launch self-check → loading → companion (Radar default branch)
pnpm test -- runLaunchSequence

# Voice ingest gate + applyIngestCreate path
pnpm test -- ingestActions parseIngestCommand

# Product invariant: user owns create
pnpm test -- "Product invariants" "voice ingest"

# Provenance on ingest (source refs, not news fragments)
pnpm test -- provenanceIngest

# Live source smoke (optional network evidence)
pnpm test -- liveSourceSmoke

# Showcase fixed ingest golden (demo path only)
pnpm test -- showcaseCoreLoop showcaseIngest
```

## Primary test files

| File | Focus |
|------|-------|
| `src/lib/runLaunchSequence.test.ts` | Default launch sequence |
| `src/conversation/ingestActions.test.ts` | Confirm / reject / teach-more |
| `src/lib/parseIngestCommand.test.ts` | Intent parsing |
| `src/invariants/productInvariants.test.ts` | V3 gate invariants |
| `src/conversation/provenanceIngest.integration.test.ts` | SourceRef on ingest |
| `src/radar/liveSourceSmoke.test.ts` | Live fetch smoke |

## Spec cross-links

- [`specs/V3-voice-ingest.md`](../../specs/V3-voice-ingest.md)
- [`specs/kos-productization/KP-01-default-radar-launch.md`](../../specs/kos-productization/KP-01-default-radar-launch.md)
- [`specs/KOS-D1-provenance.md`](../../specs/KOS-D1-provenance.md)
