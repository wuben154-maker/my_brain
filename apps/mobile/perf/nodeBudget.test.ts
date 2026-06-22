import { describe, expect, it } from "vitest";

import {
  InMemoryGraphRepository,
  M5_VISIBLE_NODE_BUDGET,
  createEmptyCorrectionState,
  type MobilePersistedBundle,
} from "@my-brain/core";

import { hydrateMobileStores } from "../stores/persistHydrate";
import { useMobileAppStore } from "../stores/mobileAppStore";

describe("nodeBudget perf", () => {
  it("visible node slice respects M5 budget of 80", () => {
    const graph = new InMemoryGraphRepository();
    for (let i = 0; i < 120; i += 1) {
      graph.createNode({ concept: `C${i}`, intro: "i", sourceLinks: [] });
    }
    const visible = graph.getM5CandidateSnapshot().nodes;
    expect(visible.length).toBeLessThanOrEqual(M5_VISIBLE_NODE_BUDGET);
    expect(graph.countVisibleNodes()).toBeGreaterThan(M5_VISIBLE_NODE_BUDGET);
  });

  it("aggregates 10k-node libraries to the home budget without full mount", () => {
    const graph = new InMemoryGraphRepository();
    for (let i = 0; i < 10_000; i += 1) {
      graph.createNode({ concept: `C${i}`, intro: "i", sourceLinks: [] });
    }
    const slice = graph.getM5CandidateSnapshot();
    expect(slice.nodes.length).toBe(M5_VISIBLE_NODE_BUDGET);
    expect(graph.countVisibleNodes()).toBe(10_000);
  });

  it("hydrate and syncGraphView expose the same budgeted visible nodes", () => {
    const graph = new InMemoryGraphRepository();
    for (let i = 0; i < 120; i += 1) {
      graph.createNode({ concept: `C${i}`, intro: "i", sourceLinks: [] });
    }
    const created = graph.getSnapshot();
    graph.replaceSnapshot({
      ...created,
      nodes: created.nodes.map((node, index) => ({
        ...node,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
      })),
    });
    const budgetedIds = graph.getM5CandidateSnapshot().nodes.map((node) => node.id);
    const rawSliceIds = graph
      .getSnapshot()
      .nodes.filter((node) => !node.archived)
      .slice(0, M5_VISIBLE_NODE_BUDGET)
      .map((node) => node.id);
    expect(rawSliceIds).not.toEqual(budgetedIds);

    const bundle: MobilePersistedBundle = {
      profile: null,
      coldStartComplete: true,
      correctionState: createEmptyCorrectionState(),
      graph: graph.getSnapshot(),
      history: [],
      provisional: [],
      pendingIngest: null,
      signals: [],
      learningTraces: [],
      worldItems: [],
      providerConfig: {
        llm: "mock",
        radar: "fixture",
        voice: "disconnected",
        storage: "ready",
      },
    };

    hydrateMobileStores(bundle, false);
    expect(useMobileAppStore.getState().visibleNodes.map((node) => node.id)).toEqual(
      budgetedIds,
    );

    useMobileAppStore.getState().syncGraphView();
    expect(useMobileAppStore.getState().visibleNodes.map((node) => node.id)).toEqual(
      budgetedIds,
    );
  });
});
