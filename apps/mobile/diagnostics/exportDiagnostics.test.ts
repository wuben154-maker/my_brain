import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BetterSqliteDriver, MobileStorage } from "@my-brain/core";

import {
  buildDiagnosticExportPayload,
  resolveDiagnosticExportContext,
} from "./exportDiagnostics";
import { resetDiagnosticRouteForTests, setDiagnosticRoute } from "./crashRouteContext";
import { getStorageSession, setStorageSession } from "../storage/storageSession";

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: { version: "0.1.0" },
    nativeBuildVersion: "99",
  },
}));

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  Share: { share: vi.fn() },
}));

describe("exportDiagnostics", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    setStorageSession(null);
    resetDiagnosticRouteForTests();
  });

  it("returns degraded when storage session missing", () => {
    setStorageSession(null);
    const result = buildDiagnosticExportPayload();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status.state).toBe("degraded");
    }
  });

  it("builds whitelisted export with route + version metadata", () => {
    const dir = mkdtempSync(join(tmpdir(), "m6-diag-export-"));
    const driver = new BetterSqliteDriver(join(dir, "m6.db"));
    const storage = new MobileStorage(driver);
    storage.migrate();
    cleanup = () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    };
    setStorageSession({ storage, driver, dbPath: join(dir, "m6.db") });
    setDiagnosticRoute("settings-screen", "SettingsScreen");
    storage.appendDiagnosticEvent({
      intent: "migration_retry",
      outcome: "ok",
      reasonCode: "SchemaMigrationError",
    });

    const result = buildDiagnosticExportPayload();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.json).toContain('"route": "settings-screen"');
      expect(result.json).toContain('"appVersion": "0.1.0"');
      expect(result.json).not.toMatch(/intro|transcript|api_key/i);
    }
  });

  it("resolveDiagnosticExportContext includes platform build", () => {
    setDiagnosticRoute("living-brain-home", "LivingBrainHome");
    const ctx = resolveDiagnosticExportContext();
    expect(ctx.platform).toBe("android");
    expect(ctx.buildNumber).toBe("99");
    expect(ctx.route).toBe("living-brain-home");
  });
});

describe("exportDiagnostics session", () => {
  it("getStorageSession reflects setStorageSession", () => {
    expect(getStorageSession()).toBeNull();
  });
});
