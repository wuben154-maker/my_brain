import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { isVitestRuntime } from "../boot/storageBootstrap";

describe("runtime storage bundle guard", () => {
  it("detects Vitest runtime for test fallback", () => {
    expect(isVitestRuntime()).toBe(true);
  });

  it("storageBootstrap does not statically import better-sqlite3 or test adapter", () => {
    const bootstrap = readFileSync(
      join(__dirname, "../boot/storageBootstrap.ts"),
      "utf8",
    );
    expect(bootstrap).not.toMatch(/BetterSqliteDriver/);
    expect(bootstrap).not.toMatch(/from\s+["'].*testStorageSession/);
    expect(bootstrap).not.toMatch(/from\s+["'].*better-sqlite3/);
    expect(bootstrap).toContain("isVitestRuntime");
    expect(bootstrap).toContain("createExpoStorageSession");
  });

  it("expo storage session opens expo-sqlite sync database", () => {
    const sessionSrc = readFileSync(
      join(__dirname, "../storage/expoStorageSession.ts"),
      "utf8",
    );
    expect(sessionSrc).toContain("openDatabaseSync");
    expect(sessionSrc).not.toMatch(/BetterSqliteDriver|better-sqlite3/);
  });
});
