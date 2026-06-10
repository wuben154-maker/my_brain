import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import type { ProvisionalNode } from "@/domain/provisional/provisionalNode";
import { normalizeConceptProvenance } from "@/domain/graph/sourceRef";
import { applyGraphMutation } from "@/lib/graphMutations";
import type { StorageProvider } from "@/storage/types";

export interface PromoteProvisionalInput {
  candidate: ProvisionalNode;
  /** Must be true — only explicit user confirm may promote to permanent graph. */
  userConfirmed: boolean;
  nowIso?: string;
}

export interface PromoteProvisionalResult {
  ok: boolean;
  reason?: string;
  concept?: ConceptNode;
  graph?: BrainGraphSnapshot;
}

/**
 * KP-14 — promote provisional candidate to permanent graph via ingest gate.
 * High confidence / strict rules alone must NOT pass userConfirmed=false.
 */
export async function promoteProvisionalToGraph(
  storage: StorageProvider,
  snapshot: BrainGraphSnapshot,
  input: PromoteProvisionalInput,
): Promise<PromoteProvisionalResult> {
  if (!input.userConfirmed) {
    return { ok: false, reason: "user_confirm_required" };
  }

  const timestamp = input.nowIso ?? new Date().toISOString();
  const concept: ConceptNode = normalizeConceptProvenance({
    id: input.candidate.id,
    title: input.candidate.title,
    intro: input.candidate.intro,
    sourceRefs: input.candidate.sourceRefs,
    sourceUrl: input.candidate.sourceRefs[0]?.url ?? null,
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const next = applyGraphMutation(snapshot, {
    id: `promote-${input.candidate.id}`,
    kind: "create",
    summary: `Promote provisional ${input.candidate.title}`,
    payload: {
      nodeKind: "concept",
      title: concept.title,
      intro: concept.intro,
      sourceRefs: concept.sourceRefs,
    },
  });

  await storage.saveConcept(concept);
  for (const edge of next.edges) {
    if (!snapshot.edges.some((existing) => existing.id === edge.id)) {
      await storage.saveEdge(edge);
    }
  }

  return { ok: true, concept, graph: next };
}

/** Explicitly blocked auto-promote path for high-confidence candidates. */
export function attemptAutoPromoteByConfidence(
  _candidate: ProvisionalNode,
  confidenceThreshold: number,
): PromoteProvisionalResult {
  if (_candidate.confidence >= confidenceThreshold) {
    return { ok: false, reason: "auto_promote_forbidden" };
  }
  return { ok: false, reason: "below_threshold" };
}
