import { describe, expect, it } from "vitest";
import type { NewsItem } from "@/domain/news";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/domain/profile";
import {
  scoreNewsByProfile,
  selectTopNewsByProfile,
} from "@/agent/curation/scoreNews";

function makeNews(
  id: string,
  title: string,
  overrides: Partial<NewsItem> = {},
): NewsItem {
  return {
    id,
    title,
    summary: `Summary ${id}`,
    sourceName: "Mock",
    sourceUrl: `https://example.com/${id}`,
    category: "ai_news",
    publishedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

const curiousProfile: UserProfile = {
  ...DEFAULT_USER_PROFILE,
  interests: ["RAG"],
  unknownTopics: ["Agent"],
  knownTopics: ["Transformer"],
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("scoreNewsByProfile", () => {
  it("ranks interest and unknown topics higher than known-only overlap", () => {
    const news = [
      makeNews("known", "Transformer 架构小更新"),
      makeNews("interest", "RAG 检索增强新论文"),
      makeNews("unknown", "多 Agent 编排框架发布"),
      makeNews("neutral", "无关行业快讯"),
    ];

    const scored = scoreNewsByProfile(news, curiousProfile);
    const byId = Object.fromEntries(scored.map((row) => [row.item.id, row]));

    expect(byId.interest?.score).toBeGreaterThan(byId.known?.score ?? 0);
    expect(byId.unknown?.score).toBeGreaterThan(byId.known?.score ?? 0);
    expect(byId.interest?.reasons.some((r) => r.includes("兴趣"))).toBe(true);
    expect(byId.unknown?.reasons.some((r) => r.includes("想学"))).toBe(true);
    expect(byId.known?.reasons.some((r) => r.includes("降权"))).toBe(true);
  });

  it("cold start degrades to recency ordering without throwing", () => {
    const news = [
      makeNews("old", "Old", {
        publishedAt: "2026-06-01T00:00:00.000Z",
      }),
      makeNews("new", "New", {
        publishedAt: "2026-06-03T00:00:00.000Z",
      }),
    ];

    const scored = scoreNewsByProfile(news, DEFAULT_USER_PROFILE);
    expect(scored[0]?.item.id).toBe("new");
    expect(scored[0]?.reasons[0]).toContain("冷启动");
  });

  it("selectTopNewsByProfile order changes with profile", () => {
    const news = [
      makeNews("a", "Transformer 微调技巧"),
      makeNews("b", "RAG 与向量库实践"),
    ];

    const knownHeavy: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      knownTopics: ["Transformer"],
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const ragFan: UserProfile = {
      ...DEFAULT_USER_PROFILE,
      interests: ["RAG"],
      updatedAt: "2026-06-01T00:00:00.000Z",
    };

    const knownFirst = selectTopNewsByProfile(news, knownHeavy, 1)[0]?.id;
    const ragFirst = selectTopNewsByProfile(news, ragFan, 1)[0]?.id;

    expect(knownFirst).toBe("b");
    expect(ragFirst).toBe("b");
  });
});
