import { describe, expect, it } from "vitest";

import type { UserModeProfile } from "../domain/userMode.js";
import type { GraphChangeRecord } from "../graph/types.js";
import { buildEvidenceBundle } from "./evidence.js";
import { buildMemoryReplay } from "./memoryReplay.js";

const profile: UserModeProfile = {
  primaryMode: "learner",
  secondaryModes: [],
  confidence: 0.8,
};

function change(id: string, summary: string, at: string): GraphChangeRecord {
  const empty = { nodes: [], edges: [] };
  return {
    id,
    kind: "node_created",
    summary,
    before: empty,
    after: empty,
    createdAt: at,
    undone: false,
  };
}

describe("replayEvidence", () => {
  it("hides replay when no graph changes or confirmed captures", () => {
    const result = buildMemoryReplay(profile, buildEvidenceBundle({}));
    expect(result.visible).toBe(false);
    expect(result.frames).toHaveLength(0);
  });

  it("binds each timeline frame to a graph change id", () => {
    const changes = [
      change("chg-1", "概念入库", "2026-06-15T09:00:00Z"),
      change("chg-2", "自动整理", "2026-06-15T10:00:00Z"),
    ];
    const result = buildMemoryReplay(
      profile,
      buildEvidenceBundle({ graphChanges: changes }),
    );
    expect(result.visible).toBe(true);
    expect(result.frames.length).toBe(2);
    for (const frame of result.frames) {
      expect(frame.changeId).toMatch(/^chg-/);
      expect(frame.evidenceRefs[0]).toBe(`graph_change:${frame.changeId}`);
    }
  });
});
