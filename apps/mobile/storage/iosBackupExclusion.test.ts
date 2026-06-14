import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("ios sqlite backup exclusion evidence", () => {
  it("native module sets and reads NSURLIsExcludedFromBackupKey on DB paths", () => {
    const swift = readFileSync(
      join(
        __dirname,
        "../modules/sqlite-backup-exclusion/ios/SqliteBackupExclusionModule.swift",
      ),
      "utf8",
    );
    expect(swift).toContain("isExcludedFromBackup = true");
    expect(swift).toContain("-wal");
    expect(swift).toContain("-shm");
    expect(swift).toContain("getBackupExclusionReport");
    expect(swift).toContain("isExcludedFromBackupKey");
  });

  it("runtime hook applies exclusion and exposes report collector", () => {
    const hook = readFileSync(join(__dirname, "iosBackupExclusion.ts"), "utf8");
    expect(hook).toContain("applyIosSqliteBackupExclusion");
    expect(hook).toContain("ensureIosSqliteWalSidecars");
    expect(hook).toContain("getIosSqliteBackupExclusionReport");
    expect(hook).toContain("collectIosSqliteBackupExclusionReport");
    expect(hook).toContain("PRAGMA journal_mode=WAL");
    expect(hook).toContain("sqlite-backup-exclusion");
  });
});
