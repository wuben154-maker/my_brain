import { describe, expect, it } from "vitest";
import type { ConceptNode } from "@/domain/graph";
import {
  applySalienceEvent,
  computeSalience,
  decay,
  rankLowSalienceCandidates,
  SALIENCE_HALF_LIFE_MS,
} from "@/lib/salience";

function node(partial: Partial<ConceptNode> & Pick<ConceptNode, "id">): ConceptNode {
  return {
    title: "概念",
    intro: "简介",
    sourceUrl: null,
    archived: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("salience (M2)", () => {
  it("decay halves score at half-life", () => {
    expect(decay(1, SALIENCE_HALF_LIFE_MS, SALIENCE_HALF_LIFE_MS)).toBeCloseTo(
      0.5,
      5,
    );
    expect(decay(1, 0, SALIENCE_HALF_LIFE_MS)).toBe(1);
  });

  it("computeSalience boosts on confirm and decays with age", () => {
    const now = Date.parse("2026-06-01T00:00:00.000Z");
    const fresh = node({
      id: "a",
      salience: 1,
      lastTouchedAt: "2026-05-31T00:00:00.000Z",
    });
    const stale = node({
      id: "b",
      salience: 1,
      lastTouchedAt: "2025-01-01T00:00:00.000Z",
    });
    const boosted = computeSalience(fresh, now, [
      { kind: "confirm", at: now, nodeId: "a" },
    ]);
    const faded = computeSalience(stale, now, []);
    expect(boosted).toBeGreaterThan(faded);
  });

  it("applySalienceEvent is deterministic for the same inputs", () => {
    const base = node({ id: "c", salience: 0.8 });
    const once = applySalienceEvent(base, "manual_edit", 1_700_000_000_000);
    const twice = applySalienceEvent(base, "manual_edit", 1_700_000_000_000);
    expect(once).toEqual(twice);
    expect(once.salience).toBeGreaterThan(base.salience ?? 0);
  });

  it("rankLowSalienceCandidates orders stale low-salience nodes for C2", () => {
    const now = Date.parse("2026-06-01T00:00:00.000Z");
    const ranked = rankLowSalienceCandidates(
      {
        nodes: [
          node({
            id: "hot",
            salience: 1.5,
            lastTouchedAt: "2026-05-30T00:00:00.000Z",
          }),
          node({
            id: "cold",
            salience: 0.2,
            lastTouchedAt: "2024-01-01T00:00:00.000Z",
          }),
        ],
        edges: [],
      },
      now,
      [],
      { maxSalience: 0.5 },
    );
    expect(ranked[0]?.nodeId).toBe("cold");
    expect(ranked[0]?.reason).toContain("显著度");
  });
});
