# packages/core/backup — gate-path test shims

Vitest and `MOBILE_GATE_EXECUTE` fixture checks reference this directory for stable paths
(`tools/mobile-execution/lib/stage-checks.ts`). Implementation lives in `packages/core/src/backup/`.

| File | Role |
|------|------|
| `device-migration.test.ts` | Atomic restore / §2.1.1 round-trip (imports `../src/backup/*`) |
| `encrypted-backup.test.ts` | Encrypted envelope round-trip (Node crypto port via `testFixtures`) |
| `correction-history.test.ts` | Correction + suppression + sensitive profile strip |
| `mergeError.test.ts` | Re-exports `../src/backup/mergeError.test.ts` coverage for gate path |

Do not duplicate behavioral tests here — extend `src/backup/*.test.ts` and keep shims thin.
