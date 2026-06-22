import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createProvisionalCandidate } from "../provisional/queue.js";
import { IngestGateViolation } from "./errors.js";
import { exportBackupSnapshotFromStorage } from "./exportBackup.js";
import { importBackupSnapshot } from "./importBackup.js";
import { createPopulatedStorage, reopenStorage } from "./testFixtures.js";

describe("provisional gate metadata backup round-trip", () => {
  it("preserves confirmedAt and ingestSource on provisional queue across export/import", () => {
    const fx = createPopulatedStorage();
    const payload = exportBackupSnapshotFromStorage(fx.storage);
    fx.cleanup();

    const pending = payload.provisional_queue.find((p) => p.status === "pending");
    const confirmed = payload.provisional_queue.find((p) => p.status === "confirmed");
    expect(pending?.ingestSource).toBe("provisional_pending");
    expect(pending?.confirmedAt).toBeUndefined();
    expect(confirmed?.ingestSource).toBe("user_confirmed_ingest");
    expect(confirmed?.confirmedAt).toBe("2026-06-11T09:00:00.000Z");

    const dir = mkdtempSync(join(tmpdir(), "mybrain-prov-gate-"));
    const { storage, driver } = reopenStorage(join(dir, "prov.db"));
    importBackupSnapshot(storage, payload);
    const restored = storage.loadProvisionalCandidates();
    driver.close();
    rmSync(dir, { recursive: true, force: true });

    expect(restored.find((p) => p.status === "pending")?.ingestSource).toBe(
      "provisional_pending",
    );
    expect(restored.find((p) => p.status === "confirmed")?.confirmedAt).toBe(
      "2026-06-11T09:00:00.000Z",
    );
    expect(restored.find((p) => p.status === "confirmed")?.ingestSource).toBe(
      "user_confirmed_ingest",
    );
  });

  it("rejects graph import when active nodes lack ingest gate metadata", () => {
    const fx = createPopulatedStorage();
    const payload = exportBackupSnapshotFromStorage(fx.storage);
    payload.graph_snapshot.nodes = payload.graph_snapshot.nodes.map((node) =>
      node.archived
        ? node
        : {
            ...node,
            confirmedAt: undefined,
            ingestSource: undefined,
          },
    );
    fx.cleanup();

    const dir = mkdtempSync(join(tmpdir(), "mybrain-ingest-gate-"));
    const { storage, driver } = reopenStorage(join(dir, "gate.db"));
    expect(() => importBackupSnapshot(storage, payload)).toThrow(IngestGateViolation);
    try {
      importBackupSnapshot(storage, payload);
    } catch (error) {
      expect(error).toBeInstanceOf(IngestGateViolation);
      const typed = error as IngestGateViolation;
      expect(typed.hint_code).toBe("ingest_gate:no_confirmed_flag");
      expect(typed.safe_retry).toContain("provisional");
    }
    driver.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("keeps newly added provisional gate fields on JSON round-trip", () => {
    const fx = createPopulatedStorage();
    const extra = createProvisionalCandidate({
      sourceType: "text",
      summary: "门控元数据",
    });
    extra.ingestSource = "provisional_pending";
    extra.confirmedAt = undefined;
    fx.storage.saveProvisionalCandidates([
      ...fx.storage.loadProvisionalCandidates(),
      extra,
    ]);

    const payload = exportBackupSnapshotFromStorage(fx.storage);
    const parsed = JSON.parse(JSON.stringify(payload));
    const dir = mkdtempSync(join(tmpdir(), "mybrain-prov-json-"));
    const { storage, driver } = reopenStorage(join(dir, "json.db"));
    importBackupSnapshot(storage, parsed);
    const match = storage
      .loadProvisionalCandidates()
      .find((p) => p.summary === "门控元数据");
    fx.cleanup();
    driver.close();
    rmSync(dir, { recursive: true, force: true });

    expect(match?.ingestSource).toBe("provisional_pending");
    expect(match?.confirmedAt).toBeUndefined();
  });
});
