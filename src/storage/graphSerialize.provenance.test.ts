import { describe, expect, it } from "vitest";
import { isConceptNode, isProjectNode, nodeSourceRefs, type ConceptNode } from "@/domain/graph";
import {
  normalizeConceptProvenance,
  serializeSourceRefsJson,
} from "@/domain/graph/sourceRef";
import {
  createTempStorage,
  reopenStorage,
  STORAGE_BACKEND_KINDS,
} from "@/invariants/testStorage";
import { SHOWCASE_GRAPH_SNAPSHOT, SHOWCASE_NOW } from "@/showcase/showcaseFixtures";

const GRAPHITI_NODE: ConceptNode = {
  id: "showcase-ingest-graphiti",
  title: "Graphiti",
  intro: "时序知识图谱：把对话与文档整理为可演化的个人认知资产。",
  sourceUrl: "https://example.com/graphiti",
  sourceRefs: [
    {
      url: "https://example.com/graphiti",
      title: "Graphiti 时序知识图谱",
      kind: "briefing",
      worldItemId: "radar-wi-showcase-3",
      ingestedAt: SHOWCASE_NOW,
    },
  ],
  archived: false,
  createdAt: SHOWCASE_NOW,
  updatedAt: SHOWCASE_NOW,
};

describe.each(STORAGE_BACKEND_KINDS)("graphSerialize.provenance (%s)", (kind) => {
  it("round-trips source_refs_json and updated_at", async () => {
    const fixture = createTempStorage(kind);
    try {
      await fixture.storage.init();
      for (const node of SHOWCASE_GRAPH_SNAPSHOT.nodes) {
        if (isConceptNode(node)) {
          await fixture.storage.saveConcept(node);
        } else if (isProjectNode(node)) {
          await fixture.storage.saveProject(node);
        }
      }
      await fixture.storage.saveConcept(GRAPHITI_NODE);

      await fixture.storage.close();
      const reopened = reopenStorage(fixture.dbPath, kind);
      await reopened.init();
      const graph = await reopened.loadGraphForDisplay();
      const graphiti = graph.nodes.find((node) => node.id === GRAPHITI_NODE.id);
      expect(graphiti && isConceptNode(graphiti) ? graphiti.sourceRefs : null).toEqual(
        GRAPHITI_NODE.sourceRefs,
      );
      expect(graphiti?.updatedAt).toBe(SHOWCASE_NOW);

      const transformer = graph.nodes.find((node) => node.id === "demo-transformer");
      expect(nodeSourceRefs(transformer!).length).toBeGreaterThanOrEqual(1);
      expect(
        transformer && isConceptNode(transformer) ? transformer.sourceUrl : null,
      ).toBe("https://arxiv.org/abs/1706.03762");

      const rag = graph.nodes.find((node) => node.id === "demo-rag");
      expect(rag && isConceptNode(rag) ? rag.sourceRefs : nodeSourceRefs(rag!)).toEqual([]);
      await reopened.close();
    } finally {
      fixture.cleanup();
    }
  });

  it("migrates legacy source_url when source_refs_json is empty", async () => {
    const fixture = createTempStorage(kind);
    try {
      await fixture.storage.init();
      const legacyOnly: ConceptNode = normalizeConceptProvenance({
        id: "legacy-only",
        title: "Legacy",
        intro: "from source_url column",
        sourceUrl: "https://example.com/legacy",
        sourceRefs: [],
        archived: false,
        createdAt: SHOWCASE_NOW,
        updatedAt: SHOWCASE_NOW,
      });
      await fixture.storage.saveConcept(legacyOnly);

      await fixture.storage.close();
      const reopened = reopenStorage(fixture.dbPath, kind);
      await reopened.init();
      const node = (await reopened.loadGraphForDisplay()).nodes.find(
        (item) => item.id === "legacy-only",
      );
      const refs = node && isConceptNode(node) ? (node.sourceRefs ?? []) : [];
      expect(refs).toHaveLength(1);
      expect(refs[0]?.url).toBe("https://example.com/legacy");
      expect(serializeSourceRefsJson(refs)).not.toBe("[]");
      await reopened.close();
    } finally {
      fixture.cleanup();
    }
  });
});
