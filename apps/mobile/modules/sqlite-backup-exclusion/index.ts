import { requireNativeModule } from "expo-modules-core";

export type BackupExclusionFileEntry = {
  path: string;
  exists: boolean;
  excludedFromBackup?: boolean;
  checkedAt: string;
  platform: "ios";
};

type SqliteBackupExclusionNative = {
  excludePathFromBackup: (path: string) => boolean;
  getBackupExclusionReport: (dbPath: string) => BackupExclusionFileEntry[];
};

const Native = requireNativeModule<SqliteBackupExclusionNative>("SqliteBackupExclusion");

/** Sets NSURLIsExcludedFromBackupKey on the DB file, WAL/SHM sidecars, and parent directory. */
export function excludePathFromBackup(path: string): boolean {
  return Native.excludePathFromBackup(path);
}

/** Reads file-level NSURLIsExcludedFromBackupKey for DB + WAL + SHM sidecars. */
export function getBackupExclusionReport(dbPath: string): BackupExclusionFileEntry[] {
  return Native.getBackupExclusionReport(dbPath);
}
