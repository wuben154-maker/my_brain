import { describe, expect, it } from "vitest";

import type { GraphChangeRecord } from "@my-brain/core";
import { measureReplayColdStartMs } from "@my-brain/core";

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

describe("replayColdStart perf", () => {
  it("fixture history cold-start P50 stays under 500ms", () => {
    const changes: GraphChangeRecord[] = [];
    for (let i = 0; i < 200; i += 1) {
      changes.push(change(`c-${i}`, `2026-06-15T${String(i % 24).padStart(2, "0")}:00:00Z`));
    }
    const { p50 } = measureReplayColdStartMs(changes, 30);
    expect(p50).toBeLessThan(500);
  });
});
