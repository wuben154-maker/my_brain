import { describe, expect, it } from "vitest";
import { applyGraphMutation, setGraphMutationClockForTests } from "@/lib/graphMutations";
import {
  computeAffectedEdgeIds,
  computeEdgeMigrations,
} from "@/lib/graphHistoryMeta";
import {
  CURATION_FIXTURE_GRAPH,
  CURATION_MUTATION_GOLDEN,
  toCurationGoldenProposal,
} from "@/showcase/curationFixtureGraph";

describe("edgeMigration", () => {
  it("merge migrates demo-agent → demo-rag-dup to demo-agent → demo-rag", () => {
    setGraphMutationClockForTests(() => "2026-06-01T00:00:00.000Z");

    const linkGolden = CURATION_MUTATION_GOLDEN[0]!;
    const mergeGolden = CURATION_MUTATION_GOLDEN[1]!;

    const afterLink = applyGraphMutation(
      CURATION_FIXTURE_GRAPH,
      toCurationGoldenProposal(linkGolden),
    );
    const beforeMerge = afterLink;
    const afterMerge = applyGraphMutation(
      beforeMerge,
      toCurationGoldenProposal(mergeGolden),
    );

    const migrations = computeEdgeMigrations(
      beforeMerge,
      afterMerge,
      "demo-rag-dup",
      "demo-rag",
    );

    expect(migrations.length).toBeGreaterThanOrEqual(1);
    expect(
      afterMerge.edges.some(
        (edge) =>
          edge.sourceId === "demo-agent" &&
          edge.targetId === "demo-rag" &&
          edge.relationType === "related",
      ),
    ).toBe(true);
    expect(
      afterMerge.edges.some(
        (edge) =>
          edge.sourceId === "demo-agent" && edge.targetId === "demo-rag-dup",
      ),
    ).toBe(false);

    const golden = mergeGolden.edgeMigrationGolden!;
    expect(
      afterMerge.edges.some(
        (edge) =>
          edge.sourceId === golden.fromNodeId &&
          edge.targetId === golden.toNodeId &&
          edge.relationType === golden.relationType,
      ),
    ).toBe(true);

    const beforeEdgeKeys = beforeMerge.edges
      .map((edge) => `${edge.sourceId}->${edge.targetId}:${edge.relationType}`)
      .sort();
    const afterOnlyIds = computeAffectedEdgeIds(beforeMerge, afterMerge);
    expect(afterOnlyIds.length).toBeGreaterThan(0);

    const restoredEdges = beforeMerge.edges
      .map((edge) => `${edge.sourceId}->${edge.targetId}:${edge.relationType}`)
      .sort();
    expect(restoredEdges).toEqual(beforeEdgeKeys);
    expect(
      beforeMerge.nodes.find((node) => node.id === "demo-rag-dup")?.archived,
    ).toBe(false);
    expect(
      afterMerge.nodes.find((node) => node.id === "demo-rag-dup")?.archived,
    ).toBe(true);

    setGraphMutationClockForTests(null);
  });
});
