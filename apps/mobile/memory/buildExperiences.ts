import type { M5SignatureExperiences } from "@my-brain/core";
import {
  buildEvidenceBundle,
  buildM5SignatureExperiences,
  getM5GraphCandidatesFromRepository,
  resolveM5FeatureFlags,
} from "@my-brain/core";
import type { InMemoryGraphRepository, InMemoryHistoryRepository } from "@my-brain/core";
import type { UserModeProfile } from "@my-brain/core";
import type { ProvisionalCandidate } from "@my-brain/core";
import type { LearningTraceRecord, WorldItemRecord } from "@my-brain/core";

export interface BuildMobileM5Input {
  profile: UserModeProfile | null;
  graph: InMemoryGraphRepository;
  history: InMemoryHistoryRepository;
  captures?: ProvisionalCandidate[];
  learningTraces?: LearningTraceRecord[];
  radarSignals?: WorldItemRecord[];
  replayCursor?: string | null;
  learningTraceWarning?: boolean;
}

export function buildMobileM5Experiences(
  input: BuildMobileM5Input,
): M5SignatureExperiences | null {
  if (!input.profile) {
    return null;
  }
  const candidates = getM5GraphCandidatesFromRepository(input.graph);
  const evidence = buildEvidenceBundle({
    graphChanges: input.history.listChanges(),
    learningTraces: input.learningTraces ?? [],
    radarSignals: input.radarSignals ?? [],
    captures: input.captures ?? [],
    nodes: candidates.nodes,
    edges: candidates.edges,
  });
  return buildM5SignatureExperiences({
    profile: input.profile,
    evidence,
    replayCursor: input.replayCursor ?? null,
    reverseQuestionSeed: input.profile.primaryMode,
    featureFlags: resolveM5FeatureFlags(),
    learningTraceWarning: input.learningTraceWarning,
  });
}
