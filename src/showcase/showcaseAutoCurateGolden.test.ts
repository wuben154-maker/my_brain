import { describe, expect, it } from "vitest";
import { isConceptNode } from "@/domain/graph";
import {
  SHOWCASE_AUTO_CURATE_GOLDEN,
  autoCurateForShowcase,
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
} from "@/showcase/showcaseFixtures";

describe("showcaseAutoCurateGolden", () => {
  it("returns exactly one ingest_link to demo-agent for showcase ingest node", () => {
    const graph = createShowcaseGraphSnapshot();
    const newNode = showcaseIngestNodeFromGraph();
    const proposals = autoCurateForShowcase(graph, newNode);

    expect(proposals).toHaveLength(1);
    const [proposal] = proposals;
    expect(proposal?.kind).toBe(SHOWCASE_AUTO_CURATE_GOLDEN.kind);
    expect(proposal?.reasonCode).toBe(SHOWCASE_AUTO_CURATE_GOLDEN.reasonCode);
    expect(proposal?.reasonDetail).toBe(SHOWCASE_AUTO_CURATE_GOLDEN.reasonDetail);
    expect(proposal?.summary).toBe(SHOWCASE_AUTO_CURATE_GOLDEN.summary);
    expect(proposal?.payload).toMatchObject({
      sourceId: SHOWCASE_AUTO_CURATE_GOLDEN.sourceId,
      targetId: SHOWCASE_AUTO_CURATE_GOLDEN.targetId,
      relationType: SHOWCASE_AUTO_CURATE_GOLDEN.relationType,
    });
    expect(proposal?.affectedNodeIds).toEqual([
      SHOWCASE_AUTO_CURATE_GOLDEN.sourceId,
      SHOWCASE_AUTO_CURATE_GOLDEN.targetId,
    ]);
  });

  it("returns no proposals for non-showcase nodes", () => {
    const graph = createShowcaseGraphSnapshot();
    const other = graph.nodes.find((n) => n.id === "demo-rag");
    expect(other).toBeDefined();
    if (!other || !isConceptNode(other)) {
      throw new Error("demo-rag should be a concept node");
    }
    expect(autoCurateForShowcase(graph, other)).toEqual([]);
  });

  it("never emits merge or archive mutations", () => {
    const graph = createShowcaseGraphSnapshot();
    const newNode = showcaseIngestNodeFromGraph();
    const proposals = autoCurateForShowcase(graph, newNode);
    expect(proposals.every((p) => p.kind === "link")).toBe(true);
    expect(proposals.some((p) => p.kind === "merge" || p.kind === "archive")).toBe(
      false,
    );
  });
});
