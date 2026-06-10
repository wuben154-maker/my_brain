import type {
  BrainGraphSnapshot,
  ConceptNode,
  GraphEdge,
  GraphMutationProposal,
} from "@/domain/graph";
import { isConceptNode } from "@/domain/graph";
import {
  readAttachPayload,
  readArchivePayload,
  readCreatePayload,
  readLinkPayload,
  readMergePayload,
  readUpdatePayload,
} from "@/domain/graphMutationPayloads";
import {
  isResearchTempId,
  resolveResearchTempIdsInProposal,
  sortResearchProposalsForApprove,
  toResearchTempId,
} from "@/agent/jobs/topicResearchJob";

export interface ProposalPreviewOverlay {
  highlightedNodeIds: string[];
  highlightedEdgeIds: string[];
  ghostNodes: ConceptNode[];
  ghostEdges: GraphEdge[];
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function findNodeByTitle(
  graph: BrainGraphSnapshot,
  title: string,
): ConceptNode | undefined {
  const norm = normalizeTitle(title);
  return graph.nodes.find(
    (node): node is ConceptNode =>
      isConceptNode(node) &&
      !node.archived &&
      normalizeTitle(node.title) === norm,
  );
}

function previewEdgeId(sourceId: string, targetId: string, relationType: string): string {
  return `preview-edge-${sourceId}-${targetId}-${relationType}`;
}

/** Derive highlight + ghost overlay for a batch of pending proposals (no graph writes). */
export function buildProposalBatchPreview(
  graph: BrainGraphSnapshot,
  proposals: GraphMutationProposal[],
): ProposalPreviewOverlay {
  const sorted = sortResearchProposalsForApprove(proposals);
  const tempToReal = new Map<string, string>();
  const ghostNodes: ConceptNode[] = [];
  const ghostEdges: GraphEdge[] = [];
  const highlightedNodeIds = new Set<string>();
  const highlightedEdgeIds = new Set<string>();
  const timestamp = new Date().toISOString();

  for (const proposal of sorted) {
    const resolved = resolveResearchTempIdsInProposal(proposal, tempToReal);

    switch (resolved.kind) {
      case "create": {
        const payload = readCreatePayload(resolved.payload);
        const tempId = toResearchTempId(payload.title);
        const existing = findNodeByTitle(graph, payload.title);
        if (existing) {
          tempToReal.set(tempId, existing.id);
          highlightedNodeIds.add(existing.id);
          break;
        }
        if (!ghostNodes.some((node) => node.id === tempId)) {
          ghostNodes.push({
            id: tempId,
            title: payload.title,
            intro: payload.intro,
            sourceUrl: payload.sourceUrl,
            archived: false,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        }
        tempToReal.set(tempId, tempId);
        highlightedNodeIds.add(tempId);
        break;
      }
      case "link": {
        const payload = readLinkPayload(resolved.payload);
        highlightedNodeIds.add(payload.sourceId);
        highlightedNodeIds.add(payload.targetId);
        const edgeId = previewEdgeId(
          payload.sourceId,
          payload.targetId,
          payload.relationType,
        );
        if (!ghostEdges.some((edge) => edge.id === edgeId)) {
          ghostEdges.push({
            id: edgeId,
            sourceId: payload.sourceId,
            targetId: payload.targetId,
            relationType: payload.relationType,
          });
        }
        highlightedEdgeIds.add(edgeId);
        break;
      }
      case "attach":
        highlightedNodeIds.add(readAttachPayload(resolved.payload).nodeId);
        break;
      case "merge": {
        const payload = readMergePayload(resolved.payload);
        highlightedNodeIds.add(payload.sourceNodeId);
        highlightedNodeIds.add(payload.targetNodeId);
        break;
      }
      case "archive":
        highlightedNodeIds.add(readArchivePayload(resolved.payload).nodeId);
        break;
      case "update":
        highlightedNodeIds.add(readUpdatePayload(resolved.payload).nodeId);
        break;
      default:
        break;
    }
  }

  return {
    highlightedNodeIds: [...highlightedNodeIds],
    highlightedEdgeIds: [...highlightedEdgeIds],
    ghostNodes,
    ghostEdges,
  };
}

export function isPreviewGhostNodeId(nodeId: string): boolean {
  return isResearchTempId(nodeId) || nodeId.startsWith("preview-ghost-");
}
