import { describe, expect, it } from "vitest";

import {
  BACKUP_MANIFEST_VERSION,
  BACKUP_REQUIRED_ENTITIES,
} from "./types.js";
import {
  buildBackupManifest,
  listMissingManifestEntities,
  validateBackupManifest,
} from "./manifest.js";
import { ManifestEntityMissing } from "./errors.js";
import { exportBackupSnapshotFromStorage } from "./exportBackup.js";
import { createPopulatedStorage } from "./testFixtures.js";

describe("backupManifest", () => {
  it("declares backup_manifest_version and included_entities minimum set", () => {
    const manifest = buildBackupManifest({
      exportedAt: "2026-06-15T00:00:00.000Z",
      schemaVersion: 1,
    });
    expect(manifest.backup_manifest_version).toBe(BACKUP_MANIFEST_VERSION);
    expect(manifest.included_entities).toEqual([...BACKUP_REQUIRED_ENTITIES]);
    expect(manifest.sensitive_profile_opt_in).toBe(false);
  });

  it("throws ManifestEntityMissing with root_cause_hint and stop_condition", () => {
    const manifest = buildBackupManifest({
      exportedAt: "2026-06-15T00:00:00.000Z",
      schemaVersion: 1,
    });
    manifest.included_entities = manifest.included_entities.filter(
      (entity) => entity !== "learning_trace",
    );
    expect(() => validateBackupManifest(manifest)).toThrow(ManifestEntityMissing);
    try {
      validateBackupManifest(manifest);
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestEntityMissing);
      const typed = error as ManifestEntityMissing;
      expect(typed.error_class).toBe("ManifestEntityMissing");
      expect(typed.hint_code).toMatch(/^missing_entity:/);
      expect(typed.root_cause_hint).toContain("learning_trace");
      expect(typed.safe_retry.length).toBeGreaterThan(10);
      expect(typed.stop_condition).toContain("partial");
      expect(typed.missingEntities).toContain("learning_trace");
    }
  });

  it("lists missing entities for verifier diagnostics", () => {
    const missing = listMissingManifestEntities({
      backup_manifest_version: 1,
      included_entities: ["graph_snapshot"],
      exported_at: "2026-06-15T00:00:00.000Z",
      schema_version: 1,
      sensitive_profile_opt_in: false,
    });
    expect(missing).toContain("graph_history");
    expect(missing).toContain("provisional_queue");
  });

  it("export from storage includes manifest entity keys", () => {
    const fx = createPopulatedStorage();
    const payload = exportBackupSnapshotFromStorage(fx.storage);
    fx.cleanup();
    expect(payload.manifest.included_entities).toEqual([...BACKUP_REQUIRED_ENTITIES]);
    expect(payload.profile_traits.length).toBeGreaterThan(0);
    expect(payload.learning_trace).toHaveLength(1);
    expect(payload.provisional_queue).toHaveLength(2);
    expect(payload.adaptive_radar_state.cursor).toEqual({
      lastSeenId: "sig-0",
      offset: 2,
    });
  });
});
