import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
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

  it("summarizes news with persona-shaped plain language", async () => {
    const text = await llm.summarizeNews(rssItem);
    expect(text).toContain("Transformer");
    expect(text).toContain("【标准】");
    expect(text).toContain("先给结论");
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

  it("planResearch returns stable structured plan", async () => {
    const plan = await llm.planResearch("RAG 向量检索", {
      ...DEFAULT_USER_PROFILE,
      interests: ["AI Agent"],
    });
    expect(plan).toEqual({
      topic: "RAG 向量检索",
      subQuestions: [
        "RAG 向量检索 的核心定义与边界是什么？",
        "RAG 向量检索 与大脑图谱里已有概念如何关联？",
        "近期关于 RAG 向量检索 有哪些值得入库的进展？",
      ],
      suggestedSources: [
        "news_registry",
        "github_trending",
        "profile_interest:AI Agent",
      ],
    });
  });

  it("synthesizeConcepts returns deterministic candidates with valid relations", async () => {
    const first = await llm.synthesizeConcepts([
      "GitHub Agent 框架发布",
      "RAG 检索增强实践",
    ]);
    const second = await llm.synthesizeConcepts([
      "GitHub Agent 框架发布",
      "RAG 检索增强实践",
    ]);
    expect(second).toEqual(first);
    expect(first).toHaveLength(2);
    expect(first[0]?.title).toBe("研究概念 A");
    expect(first[1]?.title).toBe("研究概念 B");
    expect(first[0]?.relations).toEqual([
      { targetTitle: "研究概念 B", relationType: "related" },
    ]);
  });

  it("synthesizeConcepts returns single candidate for one evidence line", async () => {
    const candidates = await llm.synthesizeConcepts(["GitHub Agent 框架发布"]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.title).toBe("AI Agent 编排");
    expect(candidates[0]?.relations.map((rel) => rel.relationType)).toEqual([
      "depends_on",
    ]);
  });

  it("synthesizeConcepts returns empty array for no evidence", async () => {
    expect(await llm.synthesizeConcepts([])).toEqual([]);
    expect(await llm.synthesizeConcepts(["", "  "])).toEqual([]);
  });
});
