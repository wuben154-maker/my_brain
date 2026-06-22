import { describe, expect, it } from "vitest";

import type { GraphSnapshot } from "../graph/types.js";
import { IngestGateViolation } from "./errors.js";
import {
  assertGraphExportIngestGate,
  exportBackupSnapshotFromStorage,
} from "./exportBackup.js";
import { createPopulatedStorage } from "./testFixtures.js";

describe("exportBackup ingest gate export policy", () => {
  it("fail-fast when active graph nodes lack ingest gate metadata", () => {
    const fx = createPopulatedStorage();
    const snapshot = fx.storage.loadGraphSnapshot();
    snapshot.nodes = snapshot.nodes.map((node) =>
      node.archived
        ? node
        : { ...node, confirmedAt: undefined, ingestSource: undefined },
    );
    fx.storage.saveGraphSnapshot(snapshot);
    expect(() => exportBackupSnapshotFromStorage(fx.storage)).toThrow(IngestGateViolation);
    try {
      exportBackupSnapshotFromStorage(fx.storage);
    } catch (error) {
      expect(error).toBeInstanceOf(IngestGateViolation);
      const typed = error as IngestGateViolation;
      expect(typed.hint_code).toBe("ingest_gate:no_confirmed_flag");
      expect(typed.message).toContain("export refuses silent backfill");
    }
    fx.cleanup();
  });

  it("assertGraphExportIngestGate does not mutate or backfill nodes", () => {
    const snapshot: GraphSnapshot = {
      nodes: [
        {
          id: "n1",
          concept: "x",
          intro: "y",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      edges: [],
    };
    expect(() => assertGraphExportIngestGate(snapshot)).toThrow(IngestGateViolation);
    expect(snapshot.nodes[0]?.confirmedAt).toBeUndefined();
    expect(snapshot.nodes[0]?.ingestSource).toBeUndefined();
  });
});
