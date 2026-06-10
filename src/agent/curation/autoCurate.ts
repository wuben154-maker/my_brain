import type {

  BrainGraphSnapshot,

  ConceptNode,

  GraphMutationProposal,

} from "@/domain/graph";
import { isConceptNode } from "@/domain/graph";

import type { CurationReasonCode } from "@/domain/graphHistory";

import type { UserProfile } from "@/domain/profile";

import { archiveProposalFromFinding } from "@/agent/jobs/curationScanJob";

import {

  detectStaleNodes,

  type StaleFinding,

} from "@/agent/curation/detectStale";

import {

  metaForSemantic,

  metaForStale,

  metaForTitleOverlap,

} from "@/agent/curation/curationReason";

import { rankSemanticPeers } from "@/agent/curation/semanticNeighbors";

import type { EmbeddingProvider } from "@/providers/embedding/types";

import { createMockEmbeddingProvider } from "@/providers/embedding/mockEmbeddingProvider";



const OVERLAP_LINK_THRESHOLD = 0.5;

const OVERLAP_MERGE_THRESHOLD = 0.75;

const SEMANTIC_MERGE_THRESHOLD = 0.82;

const SEMANTIC_LINK_THRESHOLD = 0.68;

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

    if (node.archived || node.id === newNode.id || !isConceptNode(node)) {

      continue;

    }

    const ratio = titleOverlapRatio(newNode.title, node.title);

    if (!best || ratio > best.ratio) {

      best = { peer: node, ratio };

    }

  }

  return best;

}



function semanticReasonDetail(

  sourceTitle: string,

  targetTitle: string,

  score: number,

): string {

  return `语义相似 ${score.toFixed(2)}：「${sourceTitle}」与「${targetTitle}」`;

}



export interface AutoCurateSignals {

  stale?: StaleFinding[];

}



export interface AutoCurateProposal extends GraphMutationProposal {

  reasonCode: CurationReasonCode;

  reasonDetail: string;

  affectedNodeIds: string[];

}



export async function autoCurate(

  graph: BrainGraphSnapshot,

  newNode: ConceptNode,

  _profile: UserProfile,

  signals: AutoCurateSignals = {},

  embedder: EmbeddingProvider = createMockEmbeddingProvider(),

): Promise<AutoCurateProposal[]> {

  const proposals: AutoCurateProposal[] = [];

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

      ...metaForTitleOverlap(

        newNode.id,

        overlap.peer.id,

        newNode.title,

        overlap.peer.title,

      ),

    });

  } else {

    const semanticPeers = await rankSemanticPeers(graph, newNode, embedder, {

      topK: 1,

      minScore: SEMANTIC_LINK_THRESHOLD,

    });

    const semantic = semanticPeers[0];



    if (semantic && semantic.score >= SEMANTIC_MERGE_THRESHOLD) {

      proposals.push({

        id: "auto-merge-" + newNode.id + "-" + semantic.peer.id,

        kind: "merge",

        summary: "自动合并语义相似概念",

        payload: {

          sourceNodeId: newNode.id,

          targetNodeId: semantic.peer.id,

          mergedIntro: newNode.intro || semantic.peer.intro,

        },

        ...metaForSemantic(

          newNode.id,

          semantic.peer.id,

          semanticReasonDetail(

            newNode.title,

            semantic.peer.title,

            semantic.score,

          ),

        ),

      });

    } else if (semantic && semantic.score >= SEMANTIC_LINK_THRESHOLD) {

      proposals.push({

        id: "auto-link-" + newNode.id + "-" + semantic.peer.id,

        kind: "link",

        summary: "自动关联语义相似概念",

        payload: {

          sourceId: newNode.id,

          targetId: semantic.peer.id,

          relationType: "related",

        },

        ...metaForSemantic(

          newNode.id,

          semantic.peer.id,

          semanticReasonDetail(

            newNode.title,

            semantic.peer.title,

            semantic.score,

          ),

        ),

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

        ...metaForTitleOverlap(

          newNode.id,

          overlap.peer.id,

          newNode.title,

          overlap.peer.title,

        ),

      });

    }

  }



  const stale =

    signals.stale ?? detectStaleNodes(graph, new Date(), DEFAULT_STALE_DAYS);

  let archiveIndex = 0;

  for (const finding of stale) {

    if (finding.nodeId === newNode.id) {

      continue;

    }

    const archiveProposal = archiveProposalFromFinding(finding, archiveIndex);

    proposals.push({

      ...archiveProposal,

      ...metaForStale(finding.nodeId, finding.reason),

    });

    archiveIndex += 1;

  }



  return proposals;

}

