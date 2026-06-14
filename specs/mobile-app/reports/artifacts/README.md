# Mobile gate artifacts

Structured evidence files consumed by `pnpm mobile:gate`. **Do not** mark `deviceEvidence: "present"` without collecting on a real device.

## M2 — iOS SQLite excluded-from-backup

| File | Purpose |
|------|---------|
| `m2-ios-backup-exclusion-device-evidence.template.json` | Empty schema reference |
| `m2-ios-backup-exclusion-device-evidence.json` | **Real device evidence** (gitignored until collected) |

### Collect on iPhone (no Mac)

1. Install **Dev Client** `.ipa` via EAS + Sideloadly (see [`runbooks/WINDOWS_EAS_SIDELOADLY_APPETIZE.md`](../../runbooks/WINDOWS_EAS_SIDELOADLY_APPETIZE.md)).
2. Open app → complete MigrationGate → **设置** → **生成 iOS 备份排除证据**.
3. Use system **分享** sheet → AirDrop / 邮件 / 备忘录 → save JSON on Windows as:
   `specs/mobile-app/reports/artifacts/m2-ios-backup-exclusion-device-evidence.json`
4. Update `M2-GATE-report.md` §5 to reference the artifact path (verifier reads JSON, not report keywords).
5. Re-run `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M2`.

Gate requires JSON fields:

- `deviceEvidence`: `"present"`
- `platform`: `"ios"`
- `checkedAt`: ISO timestamp
- `files[]`: entries for `mybrain.db`, `-wal`, `-shm` each with `exists: true`, `excludedFromBackup: true`, `platform: "ios"`
