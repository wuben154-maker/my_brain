import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  BetterSqliteDriver,
  MobileStorage,
  sanitizeDiagnosticExport,
  scanExportPayloadForViolations,
  buildDiagnosticExportDocument,
  serializeDiagnosticExportDocument,
} from "@my-brain/core";

describe("diagnostic export", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
  });

  it("exports only whitelisted diagnostic events", () => {
    const dir = mkdtempSync(join(tmpdir(), "diag-export-"));
    const driver = new BetterSqliteDriver(join(dir, "d.db"));
    const storage = new MobileStorage(driver);
    storage.migrate();
    cleanup = () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    };
    storage.appendDiagnosticEvent({
      intent: "export_settings",
      outcome: "ok",
      reasonCode: "export_ok",
      userMode: "tech_tracker",
    });
    const payload = sanitizeDiagnosticExport(storage.listDiagnosticEvents());
    const json = JSON.stringify({ schemaVersion: 1, events: payload });
    expect(scanExportPayloadForViolations(json)).toHaveLength(0);
    expect(json).not.toMatch(/intro|transcript|api_key/i);
  });

  it("includes route metadata when enriched for M6 export", () => {
    const dir = mkdtempSync(join(tmpdir(), "diag-export-route-"));
    const driver = new BetterSqliteDriver(join(dir, "d.db"));
    const storage = new MobileStorage(driver);
    storage.migrate();
    cleanup = () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    };
    storage.appendDiagnosticEvent({
      intent: "screen_view",
      outcome: "ok",
      reasonCode: "navigation",
    });
    const doc = buildDiagnosticExportDocument(storage.listDiagnosticEvents(), {
      appVersion: "0.1.0",
      buildNumber: "1",
      platform: "android",
      route: "living-brain-home",
      screen: "LivingBrainHome",
    });
    const json = serializeDiagnosticExportDocument(doc);
    expect(json).toContain('"route": "living-brain-home"');
    expect(scanExportPayloadForViolations(json)).toHaveLength(0);
  });
});
