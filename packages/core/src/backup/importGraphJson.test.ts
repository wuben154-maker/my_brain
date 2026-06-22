import { describe, expect, it } from "vitest";

import { exportGraphJson } from "./exportBackup.js";
import { importGraphJson, normalizeGraphSnapshot } from "./importGraphJson.js";
import { ImportSchemaMismatch } from "./errors.js";

describe("importGraphJson", () => {
  const snapshot = {
    nodes: [
      {
        id: "n2",
        concept: "B",
        intro: "b",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-13T00:00:00.000Z",
        confirmedAt: "2026-06-13T00:01:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
      {
        id: "n1",
        concept: "A",
        intro: "a",
        sourceLinks: ["https://example.com"],
        archived: true,
        createdAt: "2026-06-12T00:00:00.000Z",
        confirmedAt: "2026-06-12T00:00:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
    ],
    edges: [
      { id: "e1", fromId: "n1", toId: "n2", relation: "related" },
    ],
  };

  it("round-trips graph export JSON with stable ordering", () => {
    const exported = JSON.parse(exportGraphJson(snapshot));
    const imported = normalizeGraphSnapshot(importGraphJson(exported));
    expect(imported).toEqual(normalizeGraphSnapshot(snapshot));
  });

  it("throws ImportSchemaMismatch for unsupported schema versions", () => {
    const exported = JSON.parse(exportGraphJson(snapshot));
    expect(() => importGraphJson({ ...exported, schemaVersion: "my-brain-graph/9.9" })).toThrow(
      ImportSchemaMismatch,
    );
  });

  it("preserves archive semantics on import", () => {
    const imported = importGraphJson(JSON.parse(exportGraphJson(snapshot)));
    expect(imported.nodes.find((n) => n.id === "n1")?.archived).toBe(true);
  });
});
