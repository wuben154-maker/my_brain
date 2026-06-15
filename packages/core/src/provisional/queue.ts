import type { GraphRepository, HistoryRepository } from "../graph/types.js";
import { applyIngestCreate } from "../conversation/ingest.js";
import type { ProvisionalCandidate, ProvisionalSourceType } from "./types.js";

export interface ProvisionalQueueDeps {
  graph: GraphRepository;
  history: HistoryRepository;
}

let candidateSeq = 0;

function nextCandidateId(): string {
  candidateSeq += 1;
  return `prov-${candidateSeq}`;
}

export function createProvisionalCandidate(input: {
  sourceType: ProvisionalSourceType;
  summary: string;
  evidenceRefs?: string[];
  linkUrl?: string;
  ssrfRejectCode?: string;
  fetchHint?: string;
  fetchOk?: boolean;
}): ProvisionalCandidate {
  return {
    id: nextCandidateId(),
    sourceType: input.sourceType,
    summary: input.summary,
    evidenceRefs: input.evidenceRefs ?? [],
    createdAt: new Date().toISOString(),
    status: "pending",
    linkUrl: input.linkUrl,
    ssrfRejectCode: input.ssrfRejectCode,
    fetchHint: input.fetchHint,
    fetchOk: input.fetchOk,
  };
}

export function listPendingCandidates(
  queue: ProvisionalCandidate[],
): ProvisionalCandidate[] {
  return queue.filter((c) => c.status === "pending" || c.status === "explaining");
}

export function addCandidate(
  queue: ProvisionalCandidate[],
  candidate: ProvisionalCandidate,
): ProvisionalCandidate[] {
  return [...queue, candidate];
}

export function rejectCandidate(
  queue: ProvisionalCandidate[],
  candidateId: string,
): ProvisionalCandidate[] {
  return queue.map((c) =>
    c.id === candidateId ? { ...c, status: "rejected" as const } : c,
  );
}

export function explainCandidate(
  queue: ProvisionalCandidate[],
  candidateId: string,
): { queue: ProvisionalCandidate[]; explanation: string } {
  const updated = queue.map((c) => {
    if (c.id !== candidateId) {
      return c;
    }
    return { ...c, status: "explaining" as const };
  });
  const target = updated.find((c) => c.id === candidateId);
  const explanation = target
    ? `（演示）关于「${target.summary}」：这是 mock 讲细点，不会自动入库。`
    : "未找到候选。";
  return { queue: updated, explanation };
}

export interface ConfirmResult {
  queue: ProvisionalCandidate[];
  nodeId: string;
  autoCurateSummary: string;
}

/** Confirm is the only path to permanent graph nodes from provisional queue. */
export function confirmCandidate(
  queue: ProvisionalCandidate[],
  candidateId: string,
  deps: ProvisionalQueueDeps,
): ConfirmResult {
  const candidate = queue.find((c) => c.id === candidateId);
  if (!candidate) {
    throw new Error(`ProvisionalCandidate not found: ${candidateId}`);
  }
  if (candidate.status === "confirmed" || candidate.status === "rejected") {
    throw new Error(`ProvisionalCandidate already resolved: ${candidateId}`);
  }

  const beforeCount = deps.graph.countVisibleNodes();
  const ingest = applyIngestCreate(
    {
      concept: candidate.summary.slice(0, 48),
      intro: candidate.summary,
      sourceLinks: candidate.linkUrl ? [candidate.linkUrl] : candidate.evidenceRefs,
    },
    deps,
  );

  if (deps.graph.countVisibleNodes() <= beforeCount) {
    throw new Error("Ingest did not create a visible node");
  }

  const updatedQueue = queue.map((c) =>
    c.id === candidateId ? { ...c, status: "confirmed" as const } : c,
  );

  return {
    queue: updatedQueue,
    nodeId: ingest.nodeId,
    autoCurateSummary: ingest.autoCurateSummary,
  };
}
