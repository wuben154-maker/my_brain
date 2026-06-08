import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import type { BrainGraphSnapshot } from "@/domain/graph";
import {
  DEFAULT_PACK_BUDGETS,
  formatGraphContextPack,
  pickSubgraphForTurn,
} from "@/lib/graphContextPack";

function graph(nodes: BrainGraphSnapshot["nodes"], edges: BrainGraphSnapshot["edges"] = []): BrainGraphSnapshot {
  return { nodes, edges };
}

describe("graphContextPack", () => {
  it("idle_chat returns empty subgraph", () => {
    const pack = pickSubgraphForTurn({
      graph: graph([
        {
          id: "n1",
          title: "RAG",
          intro: "检索增强",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ]),
      profile: DEFAULT_USER_PROFILE,
      mode: "idle_chat",
    });
    expect(pack.nodeIds).toEqual([]);
    expect(pack.graphDigest).toBe("");
  });

  it("teaching mode picks query-related nodes within budget", () => {
    const nodes = Array.from({ length: 30 }, (_, index) => ({
      id: `node-${index}`,
      title: index === 5 ? "RAG" : `Concept-${index}`,
      intro: `Intro ${index}`,
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    }));
    const pack = pickSubgraphForTurn({
      graph: graph(nodes),
      profile: DEFAULT_USER_PROFILE,
      mode: "teaching",
      query: "RAG",
    });
    expect(pack.nodeIds.length).toBeLessThanOrEqual(DEFAULT_PACK_BUDGETS.maxNodes);
    expect(pack.graphDigest).toContain("RAG");
    expect(pack.graphDigest).not.toContain("Concept-29");
  });

  it("respects maxChars budget", () => {
    const nodes = Array.from({ length: 20 }, (_, index) => ({
      id: `n-${index}`,
      title: `Topic-${index}`,
      intro: "x".repeat(200),
      sourceUrl: null,
      archived: false,
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
      salience: 2,
    }));
    const pack = pickSubgraphForTurn({
      graph: graph(nodes),
      profile: DEFAULT_USER_PROFILE,
      mode: "briefing",
      query: "Topic",
      budgets: { maxChars: 500, maxNodes: 8 },
    });
    expect(formatGraphContextPack(pack).length).toBeLessThanOrEqual(520);
  });

  it("empty graph returns profile-only pack", () => {
    const pack = pickSubgraphForTurn({
      graph: graph([]),
      profile: { ...DEFAULT_USER_PROFILE, interests: ["AI"] },
      mode: "teaching",
      query: "RAG",
    });
    expect(pack.nodeIds).toEqual([]);
    expect(pack.profileDigest).toContain("AI");
  });
});
