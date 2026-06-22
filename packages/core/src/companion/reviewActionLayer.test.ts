import { describe, expect, it } from "vitest";

import type { UserModeProfile } from "../domain/userMode.js";
import type { GraphChangeRecord, GraphSnapshot } from "../graph/types.js";
import {
  buildDraftOnlyActions,
  buildWeeklyReviewDraft,
  cognitiveActionTypeForReviewDraft,
} from "./reviewActionLayer.js";

const snapshot: GraphSnapshot = {
  nodes: [
    {
      id: "node-a",
      concept: "RAG 检索增强",
      intro: "简介",
      sourceLinks: [],
      archived: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "node-b",
      concept: "向量数据库",
      intro: "简介",
      sourceLinks: [],
      archived: false,
      createdAt: "2026-01-02T00:00:00.000Z",
    },
  ],
  edges: [],
};

const history: GraphChangeRecord[] = [
  {
    id: "change-1",
    kind: "node_created",
    summary: "入库「RAG 检索增强」",
    before: { nodes: [], edges: [] },
    after: snapshot,
    createdAt: "2026-01-02T00:00:00.000Z",
    undone: false,
  },
];

describe("review action layer", () => {
  it("buildWeeklyReviewDraft summarizes real graph and profile state", () => {
    const profile: UserModeProfile = {
      primaryMode: "creator_researcher",
      secondaryModes: [],
      confidence: 0.8,
      recentIntent: "整理研究素材",
    };

    const draft = buildWeeklyReviewDraft(snapshot, profile, history);

    expect(draft.status).toBe("draft");
    expect(draft.summary).toContain("2 个活跃概念");
    expect(draft.summary).toContain("整理研究素材");
    expect(draft.highlights[0]).toContain("入库");
  });

  it("buildDraftOnlyActions returns draft-only actions with no executed status", () => {
    const profile: UserModeProfile = {
      primaryMode: "creator_researcher",
      secondaryModes: ["learner", "founder_project"],
      confidence: 0.75,
    };

    const actions = buildDraftOnlyActions(snapshot, profile);

    expect(actions.length).toBeGreaterThan(1);
    expect(actions.every((action) => action.status === "draft")).toBe(true);
    expect(actions.some((action) => action.kind === "weekly_review")).toBe(true);
    expect(actions.some((action) => action.kind === "learning_coach")).toBe(true);
    expect(actions.some((action) => action.kind === "project")).toBe(true);
    expect(actions.some((action) => action.kind === "writing")).toBe(true);
    expect(actions.some((action) => action.kind === "research")).toBe(true);
  });

  it("uses concept fallback highlights when history is empty", () => {
    const profile: UserModeProfile = {
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.7,
    };

    const draft = buildWeeklyReviewDraft(snapshot, profile, []);

    expect(draft.highlights.some((line) => line.includes("RAG 检索增强"))).toBe(true);
  });

  it("maps review draft kinds to draftBuilder action types", () => {
    expect(cognitiveActionTypeForReviewDraft("weekly_review")).toBe("draft_weekly_review");
    expect(cognitiveActionTypeForReviewDraft("learning_coach")).toBe("draft_learning_path");
    expect(cognitiveActionTypeForReviewDraft("project")).toBe("draft_roadmap");
    expect(cognitiveActionTypeForReviewDraft("writing")).toBe("draft_blog_post");
    expect(cognitiveActionTypeForReviewDraft("research")).toBe("draft_research_followup");
  });

  it("tech tracker profile gets weekly review draft only", () => {
    const profile: UserModeProfile = {
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.7,
    };

    const actions = buildDraftOnlyActions(snapshot, profile);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.kind).toBe("weekly_review");
  });
});
