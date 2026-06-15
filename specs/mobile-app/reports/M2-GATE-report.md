# M2-GATE 验收报告

- **阶段**：M2 — Local SQLite + 持久化可信
- **判定**：PASS
- **日期**：2026-06-14
- **执行者**：composer2.5 子 agent（M2 iOS 设备证据链路）
- **监督者**：GPT-5.5 父 agent（待签核）

## 1. Enter 条件核对

- [x] M1-GATE PASS（`specs/mobile-app/reports/M1-GATE-report.md`）
- [x] 已重读 `MOBILE_PRODUCT_PLAN.md` · `EXECUTION_GUARDRAILS.md` · `M2-local-storage-and-diagnostics.md`
- [x] `EXECUTION_STATE.json`：`currentPhase=M2`，`allowedNextAction=run_M2_only`（未由本子 agent 修改）

## 2. Exit checklist（M2 spec §8）

- [x] MigrationGate：migration 完成前无 `living-brain-home` testId
- [x] 杀进程恢复：pending + correction history SQLite 回归（Vitest / better-sqlite3 夹具）
- [x] ProfileReview 纠偏 / suppression 落盘
- [x] Settings Provider 状态面板（mock/degraded/disconnected）
- [x] M1 错误注册表 SQLite 回归
- [x] ring buffer 白名单 + diagnostic export 扫描
- [x] `history_persist_warning` / `storage_degraded` 分层
- [x] Android Auto Backup 排除 SQLite（`backup_rules.xml` + 测试）
- [x] iOS **文件级** excluded-from-backup 实现（Swift 本地 Expo module + 运行时 hook）
- [x] iOS 真机 iCloud 备份抽查（结构化 device evidence 已采集，见 §5.1）
- [x] schema 含 `confirmedAt` / `ingestSource` 预留列
- [x] 三端 storage 行为夹具 mobile 轨 PASS
- [x] `pnpm check` 绿（返工后复跑，见 §3）

## 3. 命令证据

| 命令 | exit code | 摘要 |
|------|-----------|------|
| `pnpm --filter @my-brain/core run typecheck` | 0 | 无错误 |
| `pnpm --filter @my-brain/mobile run typecheck` | 0 | 无错误（含 expo-modules-core） |
| `pnpm --filter @my-brain/mobile test` | 0 | 15 files / 29 tests PASS |
| `pnpm check` | 0 | typecheck + lint + vitest 全绿 |
| `pnpm mobile:gate M2` dry-run | 1 | commands/report PASS；sequence FAIL（verdict NEEDS_DEVICE_EVIDENCE）；deviceEvidence NEEDS_DEVICE_EVIDENCE（artifact JSON 缺失） |
| `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M2` | 1 | 同上；pnpm-check + M2 定向测试均 exit 0 |
| `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M2` | 0 | 设备证据已采集后复跑；`M2-GATE: PASS`；sequence/report/commands/forbidden/deviceEvidence 全部 PASS；NEXT `allowedNextAction: run_M3_only` |

## 4. M2 结构化证据键

| verifier 键 | 证据 ID | 摘要 |
|-------------|---------|------|
| `migration_gate` | E2-MIG | `apps/mobile/screens/MigrationGate.test.tsx` |
| `kill_process_recovery` | E2-PERSIST | `profilePersist.test.ts` + `m1RegistryOnSqlite.test.ts` |
| `diagnostic_whitelist` | E2-RING | `ringBufferWhitelist.test.ts` + `export.test.ts` |
| `provider_status_panel` | E2-PROVIDER | `Settings.test.tsx` |
| `ingest_proposal_persist` | E2-INGEST | `m1RegistryOnSqlite.test.ts` |
| `android_backup_exclude` | E2-ANDROID-BU | `android/backup_rules.xml` + `backup_rules.test.ts` |
| `ios_backup_exclude` | E2-IOS-BU | **iosBackupExclude: fileLevel** — 见 §5 |
| `degraded_mode_layering` | E2-DEGRADED | Settings persist-warning 分层 |

## 5. iOS excluded-from-backup 审查 checklist

| 项 | 状态 | 说明 |
|----|------|------|
| DB 路径 | 签核 | Expo `openDatabaseSync(MOBILE_DB_NAME)` → `databasePath` |
| 排除 API | 签核 | `modules/sqlite-backup-exclusion` Swift：`isExcludedFromBackup = true`（NSURLIsExcludedFromBackupKey） |
| WAL/SHM sidecar | 签核 | Swift 模块同时标记 `-wal` / `-shm` |
| 运行时 hook | 签核 | `expoStorageSession.ts` → `applyIosSqliteBackupExclusion(db.databasePath)` |
| 移除无效配置 | 签核 | 已删除 `UIApplicationExcludesFromBackup`（app 级，非 DB 文件级） |
| 真机抽查 | **签核** | 结构化 artifact 已提交：`reports/artifacts/m2-ios-backup-exclusion-device-evidence.json` |

**iosBackupExclude: fileLevel** — 配置+审查已满足；真机证据须写入 JSON artifact（verifier **不**接受报告关键词）。

### 5.1 iOS 设备证据采集（Windows + iPhone，无需 Mac）

1. EAS 构建 Dev Client `.ipa` → Sideloadly 安装（[`runbooks/WINDOWS_EAS_SIDELOADLY_APPETIZE.md`](../runbooks/WINDOWS_EAS_SIDELOADLY_APPETIZE.md) §4）。
2. 启动 App，等待 MigrationGate 完成 → **设置** → **生成 iOS 备份排除证据**（testID: `settings-collect-ios-backup-evidence`）。
3. 通过系统分享将 JSON 保存到 Windows：`specs/mobile-app/reports/artifacts/m2-ios-backup-exclusion-device-evidence.json`
4. 模板参考：`reports/artifacts/m2-ios-backup-exclusion-device-evidence.template.json`
5. 重新运行 `MOBILE_GATE_EXECUTE=1 pnpm mobile:gate M2`

**当前状态：** artifact **已采集** → gate `m2-ios-backup-device-evidence` → **PASS**

## 6. 设计取舍（Expo SQLite vs test adapter）

- **core**：`SqlDriver` + `MobileStorage`；Vitest 经 `testStorageSession.ts` 使用 `BetterSqliteDriver`。
- **RN 运行时**：`expoStorageSession.ts` → `openDatabaseSync` + 同步 `ExpoSqliteDriver`（`execSync`/`runSync`/`getAllSync`/`getFirstSync`/`withTransactionSync`）。
- **bootstrap 分流**：`storageBootstrap.ts` 在 `process.env.VITEST === "true"` 时 dynamic require 测试 adapter；否则 require expo 路径。`runtimeBundleGuard.test.ts` 静态断言 bootstrap 不静态引用 better-sqlite3。
- **边界**：core 不依赖 `expo-sqlite`；mobile 壳负责平台 adapter。

## 7. Commit / Diff

- 未提交 git（按任务要求）

## 8. 风险与 waivers

- iOS 真机 iCloud 备份属性抽查已执行；结构化 JSON 显示 `mybrain.db`、`-wal`、`-shm` 均 `exists: true` 且 `excludedFromBackup: true`
- Expo 本地 module 需 Dev Client `prebuild` 后才能在 iOS 设备生效（静态+单测已覆盖 Swift/TS 接线）
- 无 waiver 跳过 ring buffer / M1 错误回归

## 9. 下一阶段许可

- [x] `pnpm mobile:gate M2` **PASS** — 设备证据已采集，verifier exit 0
- [x] `EXECUTION_STATE.json` 更新 — `lastPassedPhase=M2`，`allowedNextAction=run_M3_only`
- [x] 批准进入 M3

## 10. 父 agent 签核

- 结论：**PASS，允许复跑 M2 verifier 并在通过后推进 M3。**
- 备注：父 agent 已接收真实 iPhone 采集的结构化设备证据，artifact 路径为 `specs/mobile-app/reports/artifacts/m2-ios-backup-exclusion-device-evidence.json`。证据显示 `deviceEvidence: present`，且 `mybrain.db`、`-wal`、`-shm` 均存在并设置 `NSURLIsExcludedFromBackupKey`。
