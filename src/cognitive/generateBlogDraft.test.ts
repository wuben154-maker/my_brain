import { describe, expect, it } from "vitest";
import { bodyMarkdownPrefixHash } from "@/domain/actions/cognitiveAction";
import { parseBlogMetadataFromAction } from "@/domain/actions/writingResearchMetadata";
import {
  BLOG_DRAFT_GOLDEN_ID,
  BLOG_DRAFT_GOLDEN_TITLE,
  blogDraftMatchesGolden,
  generateBlogDraft,
} from "@/cognitive/generateBlogDraft";
import { PROVENANCE_GRAPH_GOLDEN } from "@/showcase/showcaseFixtures";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";

describe("generateBlogDraft", () => {
  it("matches WRITING_RESEARCH_GOLDEN blog entry with graphiti ingested", () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const { action } = generateBlogDraft({
      graph,
      createdAt: SHOWCASE_NOW,
    });
    expect(action).not.toBeNull();
    expect(blogDraftMatchesGolden(action!, { includesGraphiti: true })).toBe(true);
    expect(action!.id).toBe(BLOG_DRAFT_GOLDEN_ID);
    expect(action!.title).toBe(BLOG_DRAFT_GOLDEN_TITLE);
    expect(action!.status).toBe("draft");
    expect(action!.permissionLevel).toBe("suggest");
  });

  it("matches golden without graphiti using path subset", () => {
    const { action, warnings } = generateBlogDraft({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      createdAt: SHOWCASE_NOW,
    });
    expect(action).not.toBeNull();
    expect(blogDraftMatchesGolden(action!, { includesGraphiti: false })).toBe(true);
    expect(warnings.some((line) => line.includes("showcase-ingest-graphiti"))).toBe(true);
  });

  it("every section has valid node citations and reference source url when graphiti present", () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const { action } = generateBlogDraft({ graph, createdAt: SHOWCASE_NOW });
    const metadata = parseBlogMetadataFromAction(action!);
    expect(metadata).not.toBeNull();
    expect(metadata!.sections.length).toBeGreaterThanOrEqual(3);
    const nodeIds = new Set(graph.nodes.filter((n) => !n.archived).map((n) => n.id));
    for (const section of metadata!.sections) {
      expect(section.citations.length).toBeGreaterThanOrEqual(1);
      for (const nodeId of section.citations) {
        expect(nodeIds.has(nodeId)).toBe(true);
      }
    }
    expect(action!.bodyMarkdown).toContain("## 参考来源");
    expect(action!.bodyMarkdown).toContain(PROVENANCE_GRAPH_GOLDEN.sourceRefs[0]!.url!);
    for (const citation of action!.citations) {
      expect(citation.type).toBe("node");
      expect(nodeIds.has(citation.id)).toBe(true);
    }
  });

  it("bodyMarkdown prefix hash is stable for golden blog", () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const first = generateBlogDraft({ graph, createdAt: SHOWCASE_NOW }).action!;
    const second = generateBlogDraft({ graph, createdAt: SHOWCASE_NOW }).action!;
    expect(bodyMarkdownPrefixHash(first.bodyMarkdown)).toBe(
      bodyMarkdownPrefixHash(second.bodyMarkdown),
    );
    expect(first.bodyMarkdown).toBe(second.bodyMarkdown);
  });
});
