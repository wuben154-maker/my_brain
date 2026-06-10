import type { ProvisionalNode } from "@/domain/provisional/provisionalNode";
import { defaultProvisionalRepository } from "@/storage/provisionalRepository";

export interface ProvisionalCandidateInput {
  title: string;
  intro: string;
  reason: string;
  confidence: number;
  expiresAt: string;
  id?: string;
}

/** AI path — writes provisional isolation only; never permanent graph create. */
export function generateProvisionalCandidates(
  inputs: ProvisionalCandidateInput[],
  options: {
    repository?: typeof defaultProvisionalRepository;
    nowIso?: string;
    onPermanentGraphWrite?: () => void;
  } = {},
): ProvisionalNode[] {
  const repository = options.repository ?? defaultProvisionalRepository;
  const nowIso = options.nowIso ?? new Date().toISOString();
  const created: ProvisionalNode[] = [];

  for (const input of inputs) {
    const node: ProvisionalNode = {
      id: input.id ?? `prov-${input.title}-${nowIso}`,
      title: input.title,
      intro: input.intro,
      sourceRefs: [],
      reason: input.reason,
      confidence: input.confidence,
      expiresAt: input.expiresAt,
      createdAt: nowIso,
    };
    repository.save(node);
    created.push(node);
  }

  if (options.onPermanentGraphWrite) {
    throw new Error("provisional generator must not write permanent graph");
  }

  return created;
}
