import type { GraphMutationProposal } from "@/domain/graph";
import {
  readArchivePayload,
  readAttachPayload,
  readCreatePayload,
  readLinkPayload,
  readMergePayload,
  readUpdatePayload,
} from "@/domain/graphMutationPayloads";
import type { UserProfile } from "@/domain/profile";
import { isFieldUserCorrected } from "@/domain/profile/userProfile";
import type { ProposalSource } from "@/agent/types";

export interface ProposalFeedback {
  source: ProposalSource;
  kind: GraphMutationProposal["kind"];
  status: "approved" | "rejected";
  topicHint?: string;
}

const APPROVE_DELTA = 0.35;
const REJECT_DELTA = -0.45;
const MIN_WEIGHT = 0.15;
const MAX_WEIGHT = 3;

export function proposalTopicHint(
  proposal: GraphMutationProposal,
): string | undefined {
  switch (proposal.kind) {
    case "create":
      return readCreatePayload(proposal.payload).title.trim() || undefined;
    case "attach":
      return readAttachPayload(proposal.payload).nodeId;
    case "update":
      return readUpdatePayload(proposal.payload).title.trim() || undefined;
    case "merge":
      return readMergePayload(proposal.payload).targetNodeId;
    case "archive":
      return readArchivePayload(proposal.payload).nodeId;
    case "link":
      return readLinkPayload(proposal.payload).targetId;
    default:
      return undefined;
  }
}

function bumpTopicWeight(
  weights: Record<string, number>,
  topic: string,
  delta: number,
): Record<string, number> {
  const key = topic.trim();
  if (!key) {
    return weights;
  }
  const prev = weights[key] ?? 1;
  return {
    ...weights,
    [key]: Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, prev + delta)),
  };
}

function normalizeTopicWeights(
  weights: Record<string, number> | undefined,
): Record<string, number> {
  if (!weights) {
    return {};
  }
  const next: Record<string, number> = {};
  for (const [topic, weight] of Object.entries(weights)) {
    const key = topic.trim();
    if (!key || !Number.isFinite(weight)) {
      continue;
    }
    next[key] = Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, weight));
  }
  return next;
}

/** Merge distilled profile with feedback-driven weights without dropping lists. */
export function mergeUserProfileLayers(
  base: UserProfile,
  distilled: UserProfile,
): UserProfile {
  const corrected = base.correctedFields ?? [];
  const mergedInterests = isFieldUserCorrected(corrected, "interests")
    ? base.interests
    : dedupeStrings([...base.interests, ...distilled.interests]);
  const mergedKnownTopics = isFieldUserCorrected(corrected, "knownTopics")
    ? base.knownTopics
    : dedupeStrings([...base.knownTopics, ...distilled.knownTopics]);
  const mergedUnknownTopics = isFieldUserCorrected(corrected, "unknownTopics")
    ? base.unknownTopics
    : dedupeStrings([...base.unknownTopics, ...distilled.unknownTopics]);
  const mergedHabits = isFieldUserCorrected(corrected, "habits")
    ? base.habits
    : dedupeStrings([...base.habits, ...distilled.habits]);
  const mergedTopicWeights = isFieldUserCorrected(corrected, "topicWeights")
    ? normalizeTopicWeights(base.topicWeights)
    : {
        ...normalizeTopicWeights(base.topicWeights),
        ...normalizeTopicWeights(distilled.topicWeights),
      };
  const mergedExplanationStyle = isFieldUserCorrected(corrected, "explanationStyle")
    ? base.explanationStyle
    : (distilled.explanationStyle ?? base.explanationStyle ?? null);

  const mergedInterestEntries = base.interestEntries?.map((entry) => {
    if (isFieldUserCorrected(corrected, `interest.${entry.id}`)) {
      return entry;
    }
    const distilledEntry = distilled.interestEntries?.find(
      (candidate) => candidate.id === entry.id,
    );
    return distilledEntry ? { ...entry, ...distilledEntry } : entry;
  }) ?? distilled.interestEntries;

  const mergedUnderstanding = { ...base.understanding };
  if (distilled.understanding) {
    for (const [conceptId, level] of Object.entries(distilled.understanding)) {
      if (isFieldUserCorrected(corrected, `understanding.${conceptId}`)) {
        continue;
      }
      mergedUnderstanding[conceptId] = level;
    }
  }

  const mergedExplainPrefs = isFieldUserCorrected(corrected, "explainPrefs")
    ? base.explainPrefs
    : {
        preferMetaphor:
          distilled.explainPrefs?.preferMetaphor ??
          base.explainPrefs?.preferMetaphor ??
          true,
        preferSourceCode:
          distilled.explainPrefs?.preferSourceCode ??
          base.explainPrefs?.preferSourceCode ??
          false,
        preferArchitecture:
          distilled.explainPrefs?.preferArchitecture ??
          base.explainPrefs?.preferArchitecture ??
          false,
        preferInterview:
          distilled.explainPrefs?.preferInterview ??
          base.explainPrefs?.preferInterview ??
          false,
      };

  return {
    ...distilled,
    interests: mergedInterests,
    knownTopics: mergedKnownTopics,
    unknownTopics: mergedUnknownTopics,
    habits: mergedHabits,
    topicWeights: mergedTopicWeights,
    explanationStyle: mergedExplanationStyle,
    interestEntries: mergedInterestEntries,
    understanding: mergedUnderstanding,
    explainPrefs: mergedExplainPrefs,
    correctedFields: base.correctedFields,
    updatedAt: distilled.updatedAt,
  };
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    next.push(trimmed);
  }
  return next;
}

export function applyProposalFeedback(
  profile: UserProfile,
  feedback: ProposalFeedback[],
): UserProfile {
  if (feedback.length === 0) {
    return profile;
  }

  let topicWeights = normalizeTopicWeights(profile.topicWeights);
  let interests = [...profile.interests];

  for (const entry of feedback) {
    const topic = entry.topicHint?.trim();
    if (!topic) {
      continue;
    }
    if (entry.status === "approved") {
      topicWeights = bumpTopicWeight(topicWeights, topic, APPROVE_DELTA);
      if (!interests.includes(topic)) {
        interests = [...interests, topic];
      }
      continue;
    }
    topicWeights = bumpTopicWeight(topicWeights, topic, REJECT_DELTA);
    interests = interests.filter((item) => item !== topic);
  }

  return {
    ...profile,
    interests: dedupeStrings(interests),
    topicWeights,
    updatedAt: new Date().toISOString(),
  };
}

export function applyProposalFeedbackBatch(
  profile: UserProfile,
  feedback: ProposalFeedback[],
): UserProfile {
  return feedback.reduce(
    (current, entry) =>
      applyProposalFeedback(current, [entry]),
    profile,
  );
}
