import { describe, expect, it } from "vitest";

import { ImportSchemaMismatch, ManifestEntityMissing, MalformedBackupJsonError } from "./errors.js";
import { exportBackupSnapshotFromStorage, parseBackupJson, serializeBackupSnapshot } from "./exportBackup.js";
import { importBackupSnapshot } from "./importBackup.js";
import { createPopulatedStorage, reopenStorage } from "./testFixtures.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("importBackup parse and validation", () => {
  it("parseBackupJson rejects malformed JSON with structured hint", () => {
    expect(() => parseBackupJson("{not-json")).toThrow(MalformedBackupJsonError);
    try {
      parseBackupJson("{not-json");
    } catch (error) {
      expect(error).toBeInstanceOf(MalformedBackupJsonError);
      const typed = error as MalformedBackupJsonError;
      expect(typed.hint_code).toBe("import:malformed_json");
      expect(typed.message).toMatch(/parse failed/i);
    }
  });

  it("parseBackupJson rejects empty payload", () => {
    expect(() => parseBackupJson("   ")).toThrow(MalformedBackupJsonError);
  });

  it("parseBackupJson rejects schema mismatch on manifest version during import", () => {
    const fx = createPopulatedStorage();
    const json = serializeBackupSnapshot(exportBackupSnapshotFromStorage(fx.storage));
    fx.cleanup();
    const payload = JSON.parse(json) as Record<string, unknown>;
    (payload.manifest as Record<string, unknown>).backup_manifest_version = 99;

    expect(() => parseBackupJson(JSON.stringify(payload))).not.toThrow(MalformedBackupJsonError);

    const dir = mkdtempSync(join(tmpdir(), "mybrain-schema-mismatch-"));
    const { storage, driver } = reopenStorage(join(dir, "schema.db"));
    expect(() => importBackupSnapshot(storage, payload as never)).toThrow(ImportSchemaMismatch);
    expect(storage.loadGraphSnapshot().nodes).toHaveLength(0);
    driver.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("import rejects missing manifest entities without mutating local graph", () => {
    const fx = createPopulatedStorage();
    const payload = exportBackupSnapshotFromStorage(fx.storage);
    payload.manifest.included_entities = payload.manifest.included_entities.filter(
      (entity) => entity !== "learning_trace",
    );
    fx.cleanup();

    const dir = mkdtempSync(join(tmpdir(), "mybrain-missing-entity-"));
    const { storage, driver } = reopenStorage(join(dir, "missing.db"));
    storage.saveGraphSnapshot({
      nodes: [
        {
          id: "local-stays",
          concept: "本地",
          intro: "保留",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          confirmedAt: "2026-06-01T00:00:00.000Z",
          ingestSource: "user_confirmed_ingest",
        },
      ],
      edges: [],
    });

    expect(() => importBackupSnapshot(storage, payload)).toThrow(ManifestEntityMissing);
    expect(storage.loadGraphSnapshot().nodes[0]?.id).toBe("local-stays");
    driver.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("round-trip export entity count matches required manifest entities", () => {
    const fx = createPopulatedStorage();
    const exported = exportBackupSnapshotFromStorage(fx.storage);
    const json = serializeBackupSnapshot(exported);
    fx.cleanup();
    const parsed = parseBackupJson(json);
    expect(parsed.manifest.included_entities.length).toBe(exported.manifest.included_entities.length);
    expect(parsed.manifest.included_entities.length).toBeGreaterThanOrEqual(10);
  });
});
