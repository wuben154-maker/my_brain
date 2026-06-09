import { describe, expect, it } from "vitest";
import type { ConceptNode } from "@/domain/graph";
import {
  buildSourceRefFromNewsItem,
  migrateLegacySourceUrlToSourceRefs,
  normalizeConceptProvenance,
  normalizeSourceRef,
  parseSourceRefsJson,
  serializeSourceRefsJson,
  sourceRefFromLegacySourceUrl,
} from "@/domain/graph/sourceRef";
import type { NewsItem } from "@/domain/news";

const NOW = "2026-06-01T00:00:00.000Z";

describe("sourceRef", () => {
  it("normalizes valid source refs and rejects incomplete entries", () => {
    expect(
      normalizeSourceRef({
        url: "https://example.com/graphiti",
        title: "Graphiti",
        kind: "briefing",
        worldItemId: "radar-wi-showcase-3",
        ingestedAt: NOW,
      }),
    ).toEqual({
      url: "https://example.com/graphiti",
      title: "Graphiti",
      kind: "briefing",
      worldItemId: "radar-wi-showcase-3",
      ingestedAt: NOW,
    });
    expect(normalizeSourceRef({ title: "missing ingestedAt" })).toBeNull();
  });

  it("migrates legacy sourceUrl into sourceRefs[0]", () => {
    const node: ConceptNode = {
      id: "demo-transformer",
      title: "Transformer",
      intro: "自注意力序列建模架构",
      sourceUrl: "https://arxiv.org/abs/1706.03762",
      sourceRefs: [],
      archived: false,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const refs = migrateLegacySourceUrlToSourceRefs(node);
    expect(refs).toHaveLength(1);
    expect(refs[0]?.url).toBe("https://arxiv.org/abs/1706.03762");
    expect(refs[0]?.kind).toBe("manual");
    expect(normalizeConceptProvenance(node).sourceRefs).toHaveLength(1);
  });

  it("keeps explicit empty sourceRefs for manual nodes without sourceUrl", () => {
    const node: ConceptNode = {
      id: "demo-rag",
      title: "RAG",
      intro: "检索增强生成",
      sourceUrl: null,
      sourceRefs: [],
      archived: false,
      createdAt: NOW,
      updatedAt: NOW,
    };
    expect(migrateLegacySourceUrlToSourceRefs(node)).toEqual([]);
    expect(normalizeConceptProvenance(node).sourceRefs).toEqual([]);
  });

  it("round-trips sourceRefs JSON", () => {
    const refs = [
      buildSourceRefFromNewsItem(
        {
          id: "showcase-brief-3",
          category: "ai_news",
          title: "Graphiti 时序知识图谱",
          summary: "summary",
          sourceName: "Mock RSS",
          sourceUrl: "https://example.com/graphiti",
          publishedAt: NOW,
        } satisfies NewsItem,
        {
          ingestedAt: NOW,
          worldItemId: "radar-wi-showcase-3",
          kind: "briefing",
        },
      ),
    ];
    const json = serializeSourceRefsJson(refs);
    expect(parseSourceRefsJson(json)).toEqual(refs);
  });

  it("maps invalid ingest url to manual kind with null url", () => {
    const ref = buildSourceRefFromNewsItem(
      {
        id: "bad-url",
        category: "ai_news",
        title: "Broken link",
        summary: "summary",
        sourceName: "Mock RSS",
        sourceUrl: "not-a-url",
        publishedAt: NOW,
      },
      { ingestedAt: NOW, kind: "briefing" },
    );
    expect(ref.url).toBeNull();
    expect(ref.kind).toBe("manual");
  });

  it("sourceRefFromLegacySourceUrl returns null when sourceUrl missing", () => {
    expect(
      sourceRefFromLegacySourceUrl({
        title: "RAG",
        sourceUrl: null,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ).toBeNull();
  });
});
