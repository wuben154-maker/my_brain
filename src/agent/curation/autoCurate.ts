import type {
  BrainGraphSnapshot,
  ConceptNode,
  GraphMutationProposal,
} from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import { archiveProposalFromFinding } from "@/agent/jobs/curationScanJob";
import {
  detectStaleNodes,
  type StaleFinding,
} from "@/agent/curation/detectStale";

const OVERLAP_LINK_THRESHOLD = 0.5;
const OVERLAP_MERGE_THRESHOLD = 0.75;
const DEFAULT_STALE_DAYS = 90;

function tokenizeTitle(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((part) => part.length > 1);
}

function titleOverlapRatio(a: string, b: string): number {
  const tokensA = new Set(tokenizeTitle(a));
  const tokensB = new Set(tokenizeTitle(b));
  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      shared += 1;
    }
  }
  return shared / Math.min(tokensA.size, tokensB.size);
}

function bestOverlapPeer(
  graph: BrainGraphSnapshot,
  newNode: ConceptNode,
): { peer: ConceptNode; ratio: number } | null {
  let best: { peer: ConceptNode; ratio: number } | null = null;
  for (const node of graph.nodes) {
    if (node.archived || node.id === newNode.id) {
      continue;
    }
    const ratio = titleOverlapRatio(newNode.title, node.title);
    if (!best || ratio > best.ratio) {
      best = { peer: node, ratio };
    }
  }
  return best;
}

export interface AutoCurateSignals {
  stale?: StaleFinding[];
}

export function autoCurate(
  graph: BrainGraphSnapshot,
  newNode: ConceptNode,
  _profile: UserProfile,
  signals: AutoCurateSignals = {},
): GraphMutationProposal[] {
  const proposals: GraphMutationProposal[] = [];
  const overlap = bestOverlapPeer(graph, newNode);
  if (overlap && overlap.ratio >= OVERLAP_MERGE_THRESHOLD) {
    proposals.push({
      id: "auto-merge-" + newNode.id + "-" + overlap.peer.id,
      kind: "merge",
      summary: "自动合并相似概念",
      payload: {
        sourceNodeId: newNode.id,
        targetNodeId: overlap.peer.id,
        mergedIntro: newNode.intro || overlap.peer.intro,
      },
    });
  } else if (overlap && overlap.ratio >= OVERLAP_LINK_THRESHOLD) {
    proposals.push({
      id: "auto-link-" + newNode.id + "-" + overlap.peer.id,
      kind: "link",
      summary: "自动关联相似概念",
      payload: {
        sourceId: newNode.id,
        targetId: overlap.peer.id,
        relationType: "related",
      },
    });
  }

  const stale =
    signals.stale ?? detectStaleNodes(graph, new Date(), DEFAULT_STALE_DAYS);
  let archiveIndex = 0;
  for (const finding of stale) {
    if (finding.nodeId === newNode.id) {
      continue;
    }
    proposals.push(archiveProposalFromFinding(finding, archiveIndex));
    archiveIndex += 1;
  }

  return proposals;
}
