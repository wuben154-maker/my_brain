import { describe, expect, it } from "vitest";
import { GraphImportError } from "@/export/graphExportSchema";
import { exportGraphJson } from "@/export/exportGraphJson";
import { importGraphJson, normalizeBrainGraphSnapshot } from "@/export/importGraphJson";
import { readRepoSource } from "@/invariants/readRepoSource";
import {
  createShowcaseGraphSnapshot,
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";

const MCP_SOURCE_FILES = [
  "src/mcp/brainMcpTools.ts",
  "src/mcp/brainMcpServer.ts",
  "src/mcp/brainReadonlyHandlers.ts",
];

describe("importGraphJson round-trip", () => {
  it("importGraphJson(exportGraphJson(SHOWCASE_GRAPH_SNAPSHOT)) normalizes to showcase graph", () => {
    const exported = exportGraphJson(SHOWCASE_GRAPH_SNAPSHOT, { exportedAt: SHOWCASE_NOW });
    const imported = importGraphJson(exported);
    expect(normalizeBrainGraphSnapshot(imported)).toEqual(
      normalizeBrainGraphSnapshot(SHOWCASE_GRAPH_SNAPSHOT),
    );
  });

  it("rejects unsupported schemaVersion", () => {
    const exported = exportGraphJson(SHOWCASE_GRAPH_SNAPSHOT, { exportedAt: SHOWCASE_NOW });
    expect(() =>
      importGraphJson({ ...exported, schemaVersion: "my-brain-graph/9.9" }),
    ).toThrow(GraphImportError);
  });

  it("does not mutate the source graph on export/import", () => {
    const graph = createShowcaseGraphSnapshot();
    const before = structuredClone(graph);
    const imported = importGraphJson(exportGraphJson(graph, { exportedAt: SHOWCASE_NOW }));
    expect(graph).toEqual(before);
    expect(imported.nodes.length).toBe(graph.nodes.length);
  });

  it("MCP source does not expose import write paths", () => {
    for (const relativePath of MCP_SOURCE_FILES) {
      const source = readRepoSource(relativePath);
      expect(source).not.toContain("importGraphJson");
      expect(source).not.toMatch(/brain_import/i);
    }
  });
});
