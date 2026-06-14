import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  BetterSqliteDriver,
  MobileStorage,
  sanitizeDiagnosticExport,
  scanExportPayloadForViolations,
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
});
