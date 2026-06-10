import { describe, expect, it } from "vitest";
import { isConceptNode } from "@/domain/graph";
import {
  createCompanionVisualGraphSnapshot,
  VISUAL_GRAPH_PINNED_POSITIONS,
} from "@/lib/visualSnapshotFixtures";

describe("companion visual graph fixture", () => {
  it("seeds a dense hub-and-spoke graph with pinned layout parity", () => {
    const { nodes, edges } = createCompanionVisualGraphSnapshot();
    expect(nodes).toHaveLength(37);
    expect(edges.length).toBeGreaterThanOrEqual(40);

    const hubIds = nodes
      .filter((node) => isConceptNode(node) && node.hubLevel !== undefined)
      .map((n) => n.id);
    expect(hubIds).toEqual(
      expect.arrayContaining(["vis-ai", "vis-ml", "vis-cv", "vis-nlp", "vis-rl"]),
    );

    for (const node of nodes) {
      expect(VISUAL_GRAPH_PINNED_POSITIONS[node.id]).toBeDefined();
    }
  });
});
