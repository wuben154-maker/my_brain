import { describe, expect, it } from "vitest";

import type { GraphChangeRecord } from "../graph/types.js";
import { listChangesAfterCursor } from "./incrementalHistory.js";
import { buildMemoryReplay } from "./memoryReplay.js";
import { M5_MODE_FIXTURES } from "./m5Fixtures.js";
import {
  assertNoFullNodeScan,
  beginReplayQueryAudit,
  endReplayQueryAudit,
} from "./replayQueryAudit.js";

function change(id: string, at: string): GraphChangeRecord {
  const empty = { nodes: [], edges: [] };
  return {
    id,
    kind: "node_created",
    summary: `change ${id}`,
    before: empty,
    after: empty,
    createdAt: at,
    undone: false,
  };
}

describe("replayIncremental", () => {
  it("reads only changes after cursor", () => {
    const changes = [
      change("a", "2026-06-15T08:00:00Z"),
      change("b", "2026-06-15T09:00:00Z"),
      change("c", "2026-06-15T10:00:00Z"),
    ];
    const cursor = "2026-06-15T08:00:00Z:a";
    const batch = listChangesAfterCursor(changes, cursor, 10);
    expect(batch.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("rejects full node scan patterns in replay query audit", () => {
    beginReplayQueryAudit();
    try {
      expect(() =>
        listChangesAfterCursor([change("x", "2026-06-15T11:00:00Z")], null),
      ).not.toThrow();
    } finally {
      const log = endReplayQueryAudit();
      assertNoFullNodeScan(log);
      expect(log.some((e) => e.detail.includes("SELECT changes WHERE"))).toBe(true);
    }
  });

  it("fails audit when forbidden SELECT * FROM nodes appears", () => {
    beginReplayQueryAudit();
    const log = endReplayQueryAudit();
    expect(() =>
      assertNoFullNodeScan([
        ...log,
        { kind: "incremental_history", detail: "SELECT * FROM nodes" },
      ]),
    ).toThrow(/full node scan/);
  });

  it("memory replay path never registers full table node scan", () => {
    const fixture = M5_MODE_FIXTURES[0]!;
    beginReplayQueryAudit();
    buildMemoryReplay(fixture.profile, {
      graphChanges: [change("r1", "2026-06-15T12:00:00Z")],
      learningTraces: [],
      radarSignals: [],
      captures: [],
      nodes: [
        {
          id: "n1",
          concept: "Realtime API",
          intro: "语音",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-15T12:00:00Z",
        },
      ],
      edges: [],
    });
    const log = endReplayQueryAudit();
    assertNoFullNodeScan(log);
  });
});
