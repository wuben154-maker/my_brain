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
  return {
    ...distilled,
    interests: dedupeStrings([...base.interests, ...distilled.interests]),
    knownTopics: dedupeStrings([...base.knownTopics, ...distilled.knownTopics]),
    unknownTopics: dedupeStrings([
      ...base.unknownTopics,
      ...distilled.unknownTopics,
    ]),
    habits: dedupeStrings([...base.habits, ...distilled.habits]),
    topicWeights: {
      ...normalizeTopicWeights(base.topicWeights),
      ...normalizeTopicWeights(distilled.topicWeights),
    },
    explanationStyle:
      distilled.explanationStyle ?? base.explanationStyle ?? null,
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
