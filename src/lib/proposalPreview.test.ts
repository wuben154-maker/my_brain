import { describe, expect, it } from "vitest";
import type { GraphMutationProposal } from "@/domain/graph";
import { buildProposalBatchPreview } from "@/lib/proposalPreview";
import { useGraphStore } from "@/stores/graphStore";
import {
  toResearchTempId,
} from "@/agent/jobs/topicResearchJob";

describe("buildProposalBatchPreview", () => {
  it("creates ghost nodes and link highlights for a linked batch", () => {
    const tempA = toResearchTempId("研究概念 A");
    const tempB = toResearchTempId("研究概念 B");
    const proposals: GraphMutationProposal[] = [
      {
        id: "c-a",
        kind: "create",
        summary: "create A",
        payload: { title: "研究概念 A", intro: "a", sourceUrl: null },
      },
      {
        id: "c-b",
        kind: "create",
        summary: "create B",
        payload: { title: "研究概念 B", intro: "b", sourceUrl: null },
      },
      {
        id: "l-ab",
        kind: "link",
        summary: "link",
        payload: {
          sourceId: tempA,
          targetId: tempB,
          relationType: "related",
        },
      },
    ];

    const overlay = buildProposalBatchPreview({ nodes: [], edges: [] }, proposals);
    expect(overlay.ghostNodes).toHaveLength(2);
    expect(overlay.ghostEdges).toHaveLength(1);
    expect(overlay.highlightedNodeIds).toContain(tempA);
    expect(overlay.highlightedNodeIds).toContain(tempB);
  });

  it("does not mutate graphStore persistent nodes when applying preview state", () => {
    useGraphStore.setState({
      nodes: [
        {
          id: "node-1",
          title: "已有概念",
          intro: "i",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [],
      previewGhostNodes: [],
      previewGhostEdges: [],
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      selectedNodeId: null,
    });

    const beforeNodes = useGraphStore.getState().nodes;
    const overlay = buildProposalBatchPreview(beforeNodes.length ? { nodes: beforeNodes, edges: [] } : { nodes: [], edges: [] }, [
      {
        id: "c-new",
        kind: "create",
        summary: "new",
        payload: { title: "预览节点", intro: "ghost", sourceUrl: null },
      },
    ]);

    useGraphStore.getState().setProposalPreview(
      overlay.highlightedNodeIds,
      overlay.highlightedEdgeIds,
      overlay.ghostNodes,
      overlay.ghostEdges,
    );

    expect(useGraphStore.getState().nodes).toEqual(beforeNodes);
    expect(useGraphStore.getState().previewGhostNodes).toHaveLength(1);
  });
});
