import type { SqlDriver } from "@my-brain/core";
import { Platform } from "react-native";

import type { BackupExclusionFileEntry } from "../modules/sqlite-backup-exclusion";

export type { BackupExclusionFileEntry };

type SqliteBackupExclusionModule = {
  excludePathFromBackup: (path: string) => boolean;
  getBackupExclusionReport: (dbPath: string) => BackupExclusionFileEntry[];
};

function loadNativeModule(): SqliteBackupExclusionModule | null {
  if (Platform.OS !== "ios") {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- native module; optional in Vitest
    return require("../modules/sqlite-backup-exclusion") as SqliteBackupExclusionModule;
  } catch {
    return null;
  }
}

/** Relative suffixes for SQLite main file and WAL/SHM sidecars (gate artifact keys). */
export function sqliteBackupEvidenceSuffixes(dbPath: string): {
  db: string;
  wal: string;
  shm: string;
} {
  return {
    db: dbPath,
    wal: `${dbPath}-wal`,
    shm: `${dbPath}-shm`,
  };
}

/**
 * Force WAL journal mode and a tiny write so `-wal` / `-shm` sidecars exist on disk.
 * M2 gate requires file-level backup exclusion on all three paths.
 */
export function ensureIosSqliteWalSidecars(driver: SqlDriver): void {
  driver.exec("PRAGMA journal_mode=WAL;");
  driver.exec(
    "CREATE TABLE IF NOT EXISTS _m2_wal_touch (id INTEGER PRIMARY KEY CHECK (id = 1));",
  );
  driver.exec("INSERT OR REPLACE INTO _m2_wal_touch (id) VALUES (1);");
}

/**
 * Apply NSURLIsExcludedFromBackupKey to the SQLite DB path (and sidecars) on iOS.
 * Backed by local Expo module `sqlite-backup-exclusion` (requires Dev Client prebuild).
 */
export function applyIosSqliteBackupExclusion(dbPath: string): void {
  const mod = loadNativeModule();
  if (!mod) {
    return;
  }
  mod.excludePathFromBackup(dbPath);
}

/**
 * Read file-level backup exclusion flags for DB, -wal, and -shm on iOS Dev Client.
 * Returns null when not on iOS or native module is unavailable (Vitest / web).
 */
export function getIosSqliteBackupExclusionReport(
  dbPath: string,
): BackupExclusionFileEntry[] | null {
  const mod = loadNativeModule();
  if (!mod) {
    return null;
  }
  return mod.getBackupExclusionReport(dbPath);
}

/**
 * Re-apply exclusion then read the report. Used by M2 device evidence collector.
 */
export function collectIosSqliteBackupExclusionReport(
  dbPath: string,
  driver?: SqlDriver,
): BackupExclusionFileEntry[] | null {
  if (driver) {
    ensureIosSqliteWalSidecars(driver);
  }
  applyIosSqliteBackupExclusion(dbPath);
  return getIosSqliteBackupExclusionReport(dbPath);
}
