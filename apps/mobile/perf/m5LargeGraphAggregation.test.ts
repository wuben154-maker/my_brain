import { describe, expect, it } from "vitest";

import { InMemoryGraphRepository, InMemoryHistoryRepository, M5_VISIBLE_NODE_BUDGET } from "@my-brain/core";

import { buildMobileM5Experiences } from "../memory/buildExperiences";

describe("m5LargeGraphAggregation perf", () => {
  it("buildMobileM5Experiences stays bounded on a 10k-node library", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    for (let i = 0; i < 10_000; i += 1) {
      graph.createNode({ concept: `C${i}`, intro: "i", sourceLinks: [] });
    }
    history.pushChange({
      kind: "node_created",
      summary: "seed change",
      before: { nodes: [], edges: [] },
      after: graph.getM5CandidateSnapshot(),
      createdAt: "2026-06-15T08:00:00Z",
    });

    const experiences = buildMobileM5Experiences({
      profile: {
        primaryMode: "tech_tracker",
        secondaryModes: [],
        confidence: 0.9,
      },
      graph,
      history,
      radarSignals: [
        {
          id: "radar-1",
          title: "Signal",
          freshness: 0.9,
          updatedAt: "2026-06-15T08:30:00Z",
        },
      ],
    });

    expect(experiences).not.toBeNull();
    expect(graph.getM5CandidateSnapshot().nodes.length).toBe(M5_VISIBLE_NODE_BUDGET);
    expect(experiences?.reverseQuestion.evidenceRefs.length).toBeGreaterThan(0);
  });
});
