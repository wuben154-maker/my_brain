import { describe, expect, it } from "vitest";
import { exportGraphMarkdown } from "@/export/exportGraphMarkdown";
import { EXPORT_MARKDOWN_GOLDEN } from "@/export/exportGolden";
import {
  createShowcaseGraphSnapshot,
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";

describe("exportGraphMarkdown", () => {
  it("matches EXPORT_MARKDOWN_GOLDEN for A1 showcase graph", () => {
    const markdown = exportGraphMarkdown(SHOWCASE_GRAPH_SNAPSHOT, {
      exportedAt: SHOWCASE_NOW,
    });
    expect(markdown).toBe(EXPORT_MARKDOWN_GOLDEN);
  });

  it("sorts nodes by title (zh-CN locale)", () => {
    const shuffled = createShowcaseGraphSnapshot();
    shuffled.nodes = [...shuffled.nodes].reverse();
    const markdown = exportGraphMarkdown(shuffled, { exportedAt: SHOWCASE_NOW });
    const titles = [...markdown.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    expect(titles).toEqual([
      "沉浸式语音伴侣",
      "AI Agent",
      "BERT",
      "Brain MCP 只读",
      "LLM",
      "MCP",
      "RAG",
      "Self-Attention",
      "Transformer",
    ]);
  });

  it("marks archived nodes and exports sourceRefs", () => {
    const markdown = exportGraphMarkdown(SHOWCASE_GRAPH_SNAPSHOT, {
      exportedAt: SHOWCASE_NOW,
    });
    expect(markdown).toContain("## BERT");
    expect(markdown).toContain("_Archived_");
    expect(markdown).toContain("https://arxiv.org/abs/1706.03762");
  });

  it("does not mutate the source graph", () => {
    const graph = createShowcaseGraphSnapshot();
    const before = structuredClone(graph);
    exportGraphMarkdown(graph, { exportedAt: SHOWCASE_NOW });
    expect(graph).toEqual(before);
  });
});
