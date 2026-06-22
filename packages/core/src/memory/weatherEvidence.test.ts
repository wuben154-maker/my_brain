import { describe, expect, it } from "vitest";

import type { UserModeProfile } from "../domain/userMode.js";
import type { GraphChangeRecord } from "../graph/types.js";
import { buildEvidenceBundle } from "./evidence.js";
import { buildMemoryWeather } from "./memoryWeather.js";

const profile: UserModeProfile = {
  primaryMode: "tech_tracker",
  secondaryModes: [],
  confidence: 0.8,
};

function change(id: string, summary: string): GraphChangeRecord {
  const empty = { nodes: [], edges: [] };
  return {
    id,
    kind: "node_created",
    summary,
    before: empty,
    after: empty,
    createdAt: `2026-06-15T10:00:00Z`,
    undone: false,
  };
}

describe("weatherEvidence", () => {
  it("returns hidden when no evidence exists", () => {
    const result = buildMemoryWeather(profile, buildEvidenceBundle({}));
    expect(result.visible).toBe(false);
    expect(result.cards).toHaveLength(0);
  });

  it("requires evidenceRefs on every weather card", () => {
    const result = buildMemoryWeather(
      profile,
      buildEvidenceBundle({ graphChanges: [change("c1", "新信号入库")] }),
    );
    expect(result.visible).toBe(true);
    expect(result.cards.length).toBeGreaterThan(0);
    for (const card of result.cards) {
      expect(card.evidenceRefs.length).toBeGreaterThan(0);
    }
  });

  it("marks degraded when learning trace warning is active", () => {
    const result = buildMemoryWeather(
      profile,
      buildEvidenceBundle({ graphChanges: [change("c2", "趋势变化")] }),
      { learningTraceWarning: true },
    );
    expect(result.degradedReason).toBe("learning_trace_persist_warning");
    expect(result.cards[0]?.degraded).toBe(true);
  });
});
