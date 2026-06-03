import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import type { NewsItem } from "@/domain/news";
import {
  scoreNewsByProfile,
  selectTopNewsByProfile,
} from "@/agent/curation/scoreNews";
import {
  applyProposalFeedback,
  mergeUserProfileLayers,
} from "@/agent/profile/feedbackSignals";

function news(title: string): NewsItem {
  return {
    id: `n-${title}`,
    title,
    summary: title,
    sourceUrl: "https://example.com",
    sourceName: "mock",
    category: "ai_news",
    publishedAt: "2026-06-01T00:00:00.000Z",
  };
}

describe("feedbackSignals (C3)", () => {
  it("approved feedback boosts topic weight and adds interest", () => {
    const next = applyProposalFeedback(DEFAULT_USER_PROFILE, [
      {
        source: "background_ingest",
        kind: "create",
        status: "approved",
        topicHint: "RAG",
      },
    ]);
    expect(next.interests).toContain("RAG");
    expect(next.topicWeights?.RAG).toBeGreaterThan(1);
  });

  it("rejected feedback lowers weight and removes interest", () => {
    const seeded = {
      ...DEFAULT_USER_PROFILE,
      interests: ["Agent"],
      topicWeights: { Agent: 1.2 },
    };
    const next = applyProposalFeedback(seeded, [
      {
        source: "profile_suggestion",
        kind: "archive",
        status: "rejected",
        topicHint: "Agent",
      },
    ]);
    expect(next.interests).not.toContain("Agent");
    expect(next.topicWeights?.Agent).toBeLessThan(1);
  });

  it("empty feedback leaves profile unchanged", () => {
    const seeded = {
      ...DEFAULT_USER_PROFILE,
      interests: ["RAG"],
      topicWeights: { RAG: 1.1 },
    };
    expect(applyProposalFeedback(seeded, [])).toEqual(seeded);
  });

  it("mergeUserProfileLayers keeps topic weights and unions lists", () => {
    const merged = mergeUserProfileLayers(
      {
        ...DEFAULT_USER_PROFILE,
        interests: ["A"],
        topicWeights: { A: 0.5 },
      },
      {
        ...DEFAULT_USER_PROFILE,
        interests: ["B"],
        knownTopics: ["C"],
        topicWeights: { B: 1.4 },
        updatedAt: "2026-06-02T00:00:00.000Z",
      },
    );
    expect(merged.interests).toEqual(expect.arrayContaining(["A", "B"]));
    expect(merged.topicWeights?.A).toBe(0.5);
    expect(merged.topicWeights?.B).toBe(1.4);
  });

  it("rejected topics rank lower in C1 scoring", () => {
    const profile = applyProposalFeedback(
      {
        ...DEFAULT_USER_PROFILE,
        interests: ["RAG", "Agent"],
        topicWeights: { RAG: 1.5, Agent: 0.3 },
      },
      [],
    );
    const items = [news("RAG 新论文"), news("Agent 框架更新")];
    const ranked = selectTopNewsByProfile(items, profile, 2);
    expect(ranked[0]?.title).toContain("RAG");
    const scores = scoreNewsByProfile(items, profile);
    const rag = scores.find((row) => row.item.title.includes("RAG"));
    const agent = scores.find((row) => row.item.title.includes("Agent"));
    expect(rag?.score).toBeGreaterThan(agent?.score ?? 0);
  });
});
