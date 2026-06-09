import type { AutoCurateProposal } from "@/agent/curation/autoCurate";
import {
  metaForDuplicateMerge,
  metaForIngestLink,
  metaForStaleArchive,
} from "@/agent/curation/curationReason";
import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import type { CurationReasonCode } from "@/domain/graphHistory";
import {
  createShowcaseGraphSnapshot,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";

export const CURATION_FIXTURE_NOW = SHOWCASE_NOW;

const dupNode: ConceptNode = {
  id: "demo-rag-dup",
  title: "RAG 检索增强",
  intro: "检索增强生成，与 RAG 含义相近",
  sourceUrl: null,
  sourceRefs: [],
  archived: false,
  createdAt: CURATION_FIXTURE_NOW,
  updatedAt: CURATION_FIXTURE_NOW,
};

const staleNode: ConceptNode = {
  id: "demo-stale-concept",
  title: "旧版向量检索",
  intro: "已被 RAG 范式替代的旧概念",
  sourceUrl: null,
  sourceRefs: [],
  archived: false,
  createdAt: CURATION_FIXTURE_NOW,
  updatedAt: CURATION_FIXTURE_NOW,
};

/** A1 showcase graph + duplicate RAG node + stale node for D2 golden harness. */
export const CURATION_FIXTURE_GRAPH: BrainGraphSnapshot = (() => {
  const base = createShowcaseGraphSnapshot();
  return {
    nodes: [...base.nodes, dupNode, staleNode],
    edges: [
      ...base.edges,
      {
        id: "e-curation-dup-agent",
        sourceId: "demo-agent",
        targetId: "demo-rag-dup",
        relationType: "related",
      },
    ],
  };
})();

export interface CurationMutationGolden {
  id: string;
  kind: AutoCurateProposal["kind"];
  summary: string;
  reasonCode: CurationReasonCode;
  reasonDetail: string;
  affectedNodeIds: string[];
  payload: AutoCurateProposal["payload"];
  /** Expected edge endpoint migration after merge (from spec). */
  edgeMigrationGolden?: {
    fromNodeId: string;
    toNodeId: string;
    relationType: string;
  };
}

export const CURATION_MUTATION_GOLDEN: CurationMutationGolden[] = [
  {
    id: "curation-golden-link",
    kind: "link",
    summary: "已把 RAG 检索增强 连到 RAG",
    ...metaForIngestLink(
      "demo-rag-dup",
      "demo-rag",
      dupNode.title,
      "RAG",
    ),
    payload: {
      sourceId: "demo-rag-dup",
      targetId: "demo-rag",
      relationType: "related",
    },
  },
  {
    id: "curation-golden-merge",
    kind: "merge",
    summary: "已合并重复 RAG 概念",
    ...metaForDuplicateMerge("demo-rag-dup", "demo-rag", "RAG"),
    payload: {
      sourceNodeId: "demo-rag-dup",
      targetNodeId: "demo-rag",
      mergedIntro: "检索增强生成",
    },
    edgeMigrationGolden: {
      fromNodeId: "demo-agent",
      toNodeId: "demo-rag",
      relationType: "related",
    },
  },
  {
    id: "curation-golden-archive",
    kind: "archive",
    summary: "已归档旧版向量检索",
    ...metaForStaleArchive("demo-stale-concept", staleNode.title),
    payload: {
      nodeId: "demo-stale-concept",
    },
  },
];

export function toCurationGoldenProposal(
  golden: CurationMutationGolden,
): AutoCurateProposal {
  return {
    id: golden.id,
    kind: golden.kind,
    summary: golden.summary,
    payload: golden.payload,
    reasonCode: golden.reasonCode,
    reasonDetail: golden.reasonDetail,
    affectedNodeIds: golden.affectedNodeIds,
  };
}

export function createCurationFixtureSnapshot(): BrainGraphSnapshot {
  return structuredClone(CURATION_FIXTURE_GRAPH);
}
