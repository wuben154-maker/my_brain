import { create } from "zustand";
import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";
interface GraphState extends BrainGraphSnapshot {
  /** KOS-A2 star-light: focused ingest node (pulse target). */
  focusNodeId: string | null;
  highlightedNodeIds: string[];
  highlightedEdgeIds: string[];
  /** Ephemeral preview overlay — never persisted to storage (B3). */
  previewGhostNodes: ConceptNode[];
  previewGhostEdges: GraphEdge[];
  selectedNodeId: string | null;
  setGraph: (snapshot: BrainGraphSnapshot) => void;
  upsertNode: (node: ConceptNode) => void;
  upsertEdge: (edge: GraphEdge) => void;
  setIngestStarLight: (nodeId: string) => void;
  clearIngestStarLight: () => void;
  setHighlights: (nodeIds: string[], edgeIds: string[]) => void;
  setProposalPreview: (
    nodeIds: string[],
    edgeIds: string[],
    ghostNodes: ConceptNode[],
    ghostEdges: GraphEdge[],
  ) => void;
  clearHighlights: () => void;
  clearProposalPreview: () => void;
  selectNode: (nodeId: string | null) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],
  focusNodeId: null,
  highlightedNodeIds: [],
  highlightedEdgeIds: [],
  previewGhostNodes: [],
  previewGhostEdges: [],
  selectedNodeId: null,
  setGraph: (snapshot) =>
    set({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
    }),
  upsertNode: (node) =>
    set((state) => {
      const index = state.nodes.findIndex((item) => item.id === node.id);
      if (index === -1) {
        return { nodes: [...state.nodes, node] };
      }
      const nodes = [...state.nodes];
      nodes[index] = node;
      return { nodes };
    }),
  upsertEdge: (edge) =>
    set((state) => {
      const index = state.edges.findIndex((item) => item.id === edge.id);
      if (index === -1) {
        return { edges: [...state.edges, edge] };
      }
      const edges = [...state.edges];
      edges[index] = edge;
      return { edges };
    }),
  setIngestStarLight: (nodeId) =>
    set({
      focusNodeId: nodeId,
      highlightedNodeIds: [nodeId],
      highlightedEdgeIds: [],
    }),
  clearIngestStarLight: () =>
    set({
      focusNodeId: null,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
    }),
  setHighlights: (highlightedNodeIds, highlightedEdgeIds) =>
    set({ highlightedNodeIds, highlightedEdgeIds }),
  setProposalPreview: (
    highlightedNodeIds,
    highlightedEdgeIds,
    previewGhostNodes,
    previewGhostEdges,
  ) =>
    set({
      highlightedNodeIds,
      highlightedEdgeIds,
      previewGhostNodes,
      previewGhostEdges,
    }),
  clearHighlights: () =>
    set({ highlightedNodeIds: [], highlightedEdgeIds: [] }),
  clearProposalPreview: () =>
    set({
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      previewGhostNodes: [],
      previewGhostEdges: [],
    }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),
}));
