import { describe, expect, it } from "vitest";

import { InMemoryGraphRepository } from "../graph/memoryRepository.js";
import { M5_VISIBLE_NODE_BUDGET } from "./types.js";
import {
  getM5GraphCandidatesFromRepository,
  selectM5GraphCandidates,
} from "./m5GraphCandidates.js";

describe("m5GraphCandidates aggregation boundary", () => {
  it("passes through small libraries without aggregation", () => {
    const nodes = Array.from({ length: 12 }, (_, index) => ({
      id: `node-${index}`,
      concept: `C${index}`,
      intro: "i",
      sourceLinks: [],
      archived: false,
      createdAt: `2026-06-15T${String(index).padStart(2, "0")}:00:00Z`,
    }));
    const slice = selectM5GraphCandidates(nodes, []);
    expect(slice.aggregated).toBe(false);
    expect(slice.nodes).toHaveLength(12);
    expect(slice.totalVisibleNodes).toBe(12);
  });

  it("aggregates 10k visible nodes down to the M5 budget", () => {
    const nodes = Array.from({ length: 10_000 }, (_, index) => ({
      id: `node-${index}`,
      concept: `C${index}`,
      intro: "i",
      sourceLinks: [],
      archived: false,
      createdAt: `2026-06-15T${String(index).padStart(5, "0")}:00:00Z`,
    }));
    const edges = [
      {
        id: "edge-1",
        fromId: "node-9999",
        toId: "node-9998",
        relation: "related",
      },
    ];
    const slice = selectM5GraphCandidates(nodes, edges);
    expect(slice.totalVisibleNodes).toBe(10_000);
    expect(slice.aggregated).toBe(true);
    expect(slice.nodes.length).toBeLessThanOrEqual(M5_VISIBLE_NODE_BUDGET);
    expect(slice.edges.length).toBeLessThanOrEqual(edges.length);
    expect(slice.nodes.some((node) => node.id === "node-9999")).toBe(true);
  });

  it("repository helper avoids cloning the full 10k snapshot", () => {
    const graph = new InMemoryGraphRepository();
    for (let i = 0; i < 10_000; i += 1) {
      graph.createNode({
        concept: `C${i}`,
        intro: "i",
        sourceLinks: [],
      });
    }
    expect(graph.countVisibleNodes()).toBe(10_000);
    const slice = getM5GraphCandidatesFromRepository(graph);
    expect(slice.aggregated).toBe(true);
    expect(slice.nodes.length).toBe(M5_VISIBLE_NODE_BUDGET);
    expect(slice.totalVisibleNodes).toBe(10_000);
  });
});
