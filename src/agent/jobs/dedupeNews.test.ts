import { describe, expect, it } from "vitest";
import type { BrainGraphSnapshot } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import {
  dedupeAgainstGraph,
  normalizeNewsTitle,
  normalizeSourceUrl,
} from "./dedupeNews";

const emptyGraph: BrainGraphSnapshot = { nodes: [], edges: [] };

function news(
  overrides: Partial<NewsItem> & Pick<NewsItem, "id" | "title">,
): NewsItem {
  return {
    category: "ai_news",
    summary: "summary",
    sourceName: "Mock",
    sourceUrl: `https://example.com/${overrides.id}`,
    publishedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalizeNewsTitle", () => {
  it.each([
    ["  Hello   World  ", "hello world"],
    ["大模型  上下文", "大模型 上下文"],
  ])("normalizes %j → %j", (input, expected) => {
    expect(normalizeNewsTitle(input)).toBe(expected);
  });
});

describe("dedupeAgainstGraph", () => {
  it.each([
    {
      name: "keeps all when graph is empty",
      graph: emptyGraph,
      items: [news({ id: "a", title: "Alpha" })],
      expectedIds: ["a"],
    },
    {
      name: "filters by exact sourceUrl match",
      graph: {
        nodes: [
          {
            id: "n1",
            title: "Existing",
            intro: "i",
            sourceUrl: "https://example.com/a",
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        edges: [],
      },
      items: [
        news({ id: "a", title: "Different title", sourceUrl: "https://example.com/a" }),
        news({ id: "b", title: "Fresh", sourceUrl: "https://example.com/b" }),
      ],
      expectedIds: ["b"],
    },
    {
      name: "filters by normalized title match",
      graph: {
        nodes: [
          {
            id: "n1",
            title: "Agent Framework",
            intro: "i",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        edges: [],
      },
      items: [
        news({
          id: "dup",
          title: "  agent   framework ",
          sourceUrl: "https://example.com/new-url",
        }),
        news({ id: "keep", title: "Unique headline", sourceUrl: "https://example.com/u" }),
      ],
      expectedIds: ["keep"],
    },
    {
      name: "matches sourceUrl case-insensitively",
      graph: {
        nodes: [
          {
            id: "n1",
            title: "Node",
            intro: "i",
            sourceUrl: "HTTPS://Example.COM/A",
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        edges: [],
      },
      items: [news({ id: "a", title: "Other", sourceUrl: "https://example.com/a" })],
      expectedIds: [],
    },
    {
      name: "includes archived nodes in dedupe keys",
      graph: {
        nodes: [
          {
            id: "archived",
            title: "Old concept",
            intro: "i",
            sourceUrl: "https://example.com/old",
            archived: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        edges: [],
      },
      items: [news({ id: "a", title: "New", sourceUrl: "https://example.com/old" })],
      expectedIds: [],
    },
  ])("$name", ({ graph, items, expectedIds }) => {
    const result = dedupeAgainstGraph(items, graph);
    expect(result.map((item) => item.id)).toEqual(expectedIds);
  });

  it("normalizeSourceUrl trims and lowercases", () => {
    expect(normalizeSourceUrl("  HTTPS://X.COM  ")).toBe("https://x.com");
  });
});
