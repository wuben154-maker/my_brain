import { describe, expect, it } from "vitest";
import { isConceptNode } from "@/domain/graph";
import { exportGraphJson } from "@/export/exportGraphJson";
import { EXPORT_JSON_GOLDEN } from "@/export/exportGolden";
import { GRAPH_EXPORT_SCHEMA_VERSION } from "@/export/graphExportSchema";
import {
  createShowcaseGraphSnapshot,
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";

describe("exportGraphJson", () => {
  it("uses schemaVersion my-brain-graph/1.0", () => {
    const json = exportGraphJson(SHOWCASE_GRAPH_SNAPSHOT, { exportedAt: SHOWCASE_NOW });
    expect(json.schemaVersion).toBe(GRAPH_EXPORT_SCHEMA_VERSION);
    expect(json.schemaVersion).toBe("my-brain-graph/1.0");
  });

  it("matches EXPORT_JSON_GOLDEN for A1 showcase graph", () => {
    const json = exportGraphJson(SHOWCASE_GRAPH_SNAPSHOT, { exportedAt: SHOWCASE_NOW });
    expect(json).toEqual(EXPORT_JSON_GOLDEN);
  });

  it("exports only whitelisted node and edge fields", () => {
    const graph = createShowcaseGraphSnapshot();
    const firstConceptIdx = graph.nodes.findIndex(isConceptNode);
    const firstConcept = graph.nodes[firstConceptIdx];
    if (firstConcept && isConceptNode(firstConcept)) {
      graph.nodes[firstConceptIdx] = {
        ...firstConcept,
        salience: 9,
        hubLevel: 2,
        archivedAt: SHOWCASE_NOW,
        supersedesNodeId: "other",
        lastTouchedAt: SHOWCASE_NOW,
      };
    }

    const json = exportGraphJson(graph, { exportedAt: SHOWCASE_NOW });
    const allowedNodeKeys = new Set([
      "archived",
      "id",
      "intro",
      "nodeKind",
      "sourceRefs",
      "title",
      "updatedAt",
    ]);
    for (const node of json.nodes) {
      for (const key of Object.keys(node)) {
        expect(allowedNodeKeys.has(key)).toBe(true);
      }
      if (node.nodeKind === "project") {
        expect(node.nodeKind).toBe("project");
      } else {
        expect(node.nodeKind).toBeUndefined();
      }
    }
    for (const edge of json.edges) {
      expect(Object.keys(edge).sort()).toEqual([
        "id",
        "relationType",
        "sourceId",
        "targetId",
      ]);
    }
    expect(JSON.stringify(json)).not.toMatch(/salience|hubLevel|createdAt|sourceUrl/);
  });

  it("exports archived nodes with archived: true", () => {
    const json = exportGraphJson(SHOWCASE_GRAPH_SNAPSHOT, { exportedAt: SHOWCASE_NOW });
    const bert = json.nodes.find((node) => node.id === "demo-bert");
    expect(bert?.archived).toBe(true);
  });

  it("exports sourceRefs for provenance nodes", () => {
    const json = exportGraphJson(SHOWCASE_GRAPH_SNAPSHOT, { exportedAt: SHOWCASE_NOW });
    const transformer = json.nodes.find((node) => node.id === "demo-transformer");
    expect(transformer?.sourceRefs).toHaveLength(1);
    expect(transformer?.sourceRefs?.[0]?.url).toBe("https://arxiv.org/abs/1706.03762");
  });

  it("does not mutate the source graph", () => {
    const graph = createShowcaseGraphSnapshot();
    const before = structuredClone(graph);
    exportGraphJson(graph, { exportedAt: SHOWCASE_NOW });
    expect(graph).toEqual(before);
  });
});
