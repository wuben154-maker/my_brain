import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { applyProfileCorrection } from "../src/profile/correctionHistory.js";
import { exportBackupSnapshotFromStorage, parseBackupSnapshot } from "../src/backup/exportBackup.js";
import { importBackupSnapshot } from "../src/backup/importBackup.js";
import { createPopulatedStorage, reopenStorage } from "../src/backup/testFixtures.js";

describe("correctionHistory backup round-trip", () => {
  it("preserves suppression list and correction records across export/import", () => {
    const fx = createPopulatedStorage();
    const payload = exportBackupSnapshotFromStorage(fx.storage);
    fx.cleanup();

    expect(payload.profile_correction_history).toHaveLength(1);
    expect(payload.profile_correction_history[0]?.action).toBe("suppress");
    expect(payload.profile_suppression_list).toContain("mode-learner");

    const dir = mkdtempSync(join(tmpdir(), "mybrain-correction-"));
    const dbPath = join(dir, "restore.db");
    const { storage, driver } = reopenStorage(dbPath);
    importBackupSnapshot(storage, payload);
    const restored = storage.loadCorrectionState();
    driver.close();
    rmSync(dir, { recursive: true, force: true });

    expect(restored.suppressionList).toEqual(payload.profile_suppression_list);
    expect(restored.corrections).toEqual(payload.profile_correction_history);
    expect(restored.traits.find((t) => t.id === "mode-learner")?.suppressed).toBe(true);
  });

  it("default export strips sensitive recentIntent unless opt-in", () => {
    const fx = createPopulatedStorage();
    const defaultPayload = exportBackupSnapshotFromStorage(fx.storage);
    const optInPayload = exportBackupSnapshotFromStorage(fx.storage, {
      sensitiveProfileOptIn: true,
    });
    fx.cleanup();

    expect(defaultPayload.user_mode_profile.profile?.recentIntent).toBeUndefined();
    expect(optInPayload.user_mode_profile.profile?.recentIntent).toBe(
      "学习 TypeScript 模式",
    );
    expect(defaultPayload.manifest.sensitive_profile_opt_in).toBe(false);
    expect(optInPayload.manifest.sensitive_profile_opt_in).toBe(true);
  });

  it("round-trips parsed JSON without losing manual correction metadata", () => {
    const fx = createPopulatedStorage();
    let correction = fx.storage.loadCorrectionState();
    correction = applyProfileCorrection(
      correction,
      "recent-intent",
      "manual_override",
      "改为项目型",
    );
    fx.storage.saveCorrectionState(correction);

    const json = JSON.parse(
      JSON.stringify(exportBackupSnapshotFromStorage(fx.storage)),
    );
    const parsed = parseBackupSnapshot(json);
    const dir = mkdtempSync(join(tmpdir(), "mybrain-correction-json-"));
    const { storage, driver } = reopenStorage(join(dir, "roundtrip.db"));
    importBackupSnapshot(storage, parsed);
    const restored = storage.loadCorrectionState();
    fx.cleanup();
    driver.close();
    rmSync(dir, { recursive: true, force: true });

    expect(restored.corrections.some((c) => c.action === "manual_override")).toBe(true);
  });
});
