import { describe, expect, it } from "vitest";

import { InMemoryGraphRepository, InMemoryHistoryRepository } from "@my-brain/core";

import { buildMemoryReviewDraftState } from "./reviewActionModel";

describe("reviewActionModel", () => {
  it("builds weekly draft and mode-specific actions from real graph state", () => {
    const graph = new InMemoryGraphRepository();
    graph.createNode({
      concept: "RAG 检索增强",
      intro: "简介",
      sourceLinks: [],
    });

    const history = new InMemoryHistoryRepository();
    history.pushChange({
      kind: "node_created",
      summary: "入库「RAG 检索增强」",
      before: { nodes: [], edges: [] },
      after: graph.getSnapshot(),
      createdAt: new Date().toISOString(),
    });

    const state = buildMemoryReviewDraftState({
      snapshot: graph.getSnapshot(),
      profile: {
        primaryMode: "creator_researcher",
        secondaryModes: ["learner"],
        confidence: 0.8,
        recentIntent: "整理研究素材",
      },
      history: history.listChanges(),
    });

    expect(state.weeklyDraft.status).toBe("draft");
    expect(state.weeklyDraft.summary).toContain("整理研究素材");
    expect(state.draftActions.every((action) => action.status === "draft")).toBe(true);
    expect(state.draftActions.some((action) => action.kind === "writing")).toBe(true);
  });

  it("falls back to default profile when user profile is missing", () => {
    const graph = new InMemoryGraphRepository();
    const state = buildMemoryReviewDraftState({
      snapshot: graph.getSnapshot(),
      profile: null,
      history: [],
    });

    expect(state.weeklyDraft.summary).toContain("技术追踪者");
    expect(state.draftActions).toHaveLength(1);
    expect(state.draftActions[0]?.kind).toBe("weekly_review");
  });
});
