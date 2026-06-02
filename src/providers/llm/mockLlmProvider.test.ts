import { describe, expect, it } from "vitest";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import type { NewsItem } from "@/domain/news";

const rssItem: NewsItem = {
  id: "news-rss-1",
  title: "Transformer 上下文窗口再扩展",
  summary: "更长 context 支持整本书级别输入。",
  sourceUrl: "https://example.com/context",
  sourceName: "Mock RSS",
  category: "ai_news",
  publishedAt: "2026-06-01T00:00:00.000Z",
};

const githubItem: NewsItem = {
  id: "news-gh-1",
  title: "agent-framework-starter",
  summary: "快速搭建 Agent 流水线的 starter repo。",
  sourceUrl: "https://github.com/example/agent-framework",
  sourceName: "GitHub Trending",
  category: "github_trending",
  publishedAt: "2026-06-01T00:00:00.000Z",
};

describe("MockLlmProvider", () => {
  const llm = createMockLlmProvider();

  it("summarizes news in plain language", async () => {
    const text = await llm.summarizeNews(rssItem);
    expect(text).toContain("Transformer");
    expect(text).toContain("Mock");
  });

  it("proposes create for empty graph", async () => {
    const context = JSON.stringify({ newsItem: rssItem, nodes: [] });
    const proposals = await llm.proposeGraphMutations(context);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.kind).toBe("create");
  });

  it("proposes create + link for github trending when related node exists", async () => {
    const context = JSON.stringify({
      newsItem: githubItem,
      nodes: [
        {
          id: "n1",
          title: "Agent Framework",
          intro: "已有概念",
        },
      ],
    });
    const proposals = await llm.proposeGraphMutations(context);
    expect(proposals.length).toBeGreaterThanOrEqual(1);
    expect(proposals[0]?.kind).toBe("create");
  });
});
