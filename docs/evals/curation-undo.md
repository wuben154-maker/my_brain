# Eval — Curation & undo

**Maturity:** **default** post-ingest auto-curate (V4) with **default** graph history undo.

## What “pass” means

- After user-confirmed ingest, auto-curate may link / merge / archive with reason codes.
- Every structural mutation is recorded in graph history and undo restores prior snapshot.
- Undo removes auto-curation effects without deleting user-confirmed nodes.

## Three-path reminder

Showcase (`?showcase=1`) uses golden link `ingest_link` → undo demo. Default Radar path uses the same V4 pipeline — not a separate curation engine.

## Verification commands

```bash
# Auto-curate after ingest
pnpm test -- autoCurate runAutoCurateAfterIngest

# Graph history store + undo
pnpm test -- graphHistoryStore

# Reason codes + report surface
pnpm test -- curationReason curationReport

# Golden mutation + undo (showcase harness)
pnpm test -- curationMutationGolden showcaseUndoReport

# Product invariant: auto organize after ingest, not before create
pnpm test -- "post-ingest auto-curate"

# Edge migration on merge/archive
pnpm test -- edgeMigration graphMutations
```

## Primary test files

| File | Focus |
|------|-------|
| `src/agent/curation/autoCurate.test.ts` | Curation decisions |
| `src/lib/runAutoCuratePipeline.test.ts` | Post-ingest pipeline |
| `src/stores/graphHistoryStore.test.ts` | Snapshots + undo |
| `src/agent/curation/curationReason.test.ts` | Reason codes |
| `src/showcase/showcaseUndoReport.integration.test.ts` | End-to-end undo demo |
| `src/showcase/curationMutationGolden.test.ts` | Golden before/after |

## Spec cross-links

- [`specs/V4-auto-curate.md`](../../specs/V4-auto-curate.md)
- [`specs/KOS-A3-undo-report.md`](../../specs/KOS-A3-undo-report.md)
- [`specs/KOS-D2-curation-reasons.md`](../../specs/KOS-D2-curation-reasons.md)
