import { create } from "zustand";
import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";

interface GraphState extends BrainGraphSnapshot {
  highlightedNodeIds: string[];
  highlightedEdgeIds: string[];
  setGraph: (snapshot: BrainGraphSnapshot) => void;
  upsertNode: (node: ConceptNode) => void;
  upsertEdge: (edge: GraphEdge) => void;
  setHighlights: (nodeIds: string[], edgeIds: string[]) => void;
  clearHighlights: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  nodes: [],
  edges: [],
  highlightedNodeIds: [],
  highlightedEdgeIds: [],
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
  setHighlights: (highlightedNodeIds, highlightedEdgeIds) =>
    set({ highlightedNodeIds, highlightedEdgeIds }),
  clearHighlights: () =>
    set({ highlightedNodeIds: [], highlightedEdgeIds: [] }),
}));
