import { DEFAULT_USER_PROFILE, type UserProfile } from "@/domain/profile";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import type { LlmProvider } from "@/providers/llm/types";
import type { EvolutionEvalCase } from "./fixtures";

export interface EvolutionEvalReport {
  caseId: string;
  scores: number[];
  topics: string[];
}

function profileCorpus(profile: UserProfile): string {
  return [
    ...profile.interests,
    ...profile.knownTopics,
    ...profile.unknownTopics,
    profile.explanationStyle ?? "",
    ...(profile.habits ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

/** Fraction of topics whose keyword appears somewhere in the distilled profile. */
export function scoreProfileTopicMatch(
  profile: UserProfile,
  topics: string[],
): number {
  if (topics.length === 0) {
    return 0;
  }
  const corpus = profileCorpus(profile);
  let hits = 0;
  for (const topic of topics) {
    const needle = topic.toLowerCase();
    if (corpus.includes(needle)) {
      hits += 1;
    }
  }
  return hits / topics.length;
}

export function isNonDecreasing(scores: number[]): boolean {
  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index]! < scores[index - 1]!) {
      return false;
    }
  }
  return true;
}

export async function runEvolutionEval(
  evalCase: EvolutionEvalCase,
  llm: LlmProvider = createMockLlmProvider(),
): Promise<EvolutionEvalReport> {
  let profile: UserProfile = { ...DEFAULT_USER_PROFILE };
  const scores: number[] = [];

  for (const round of evalCase.rounds) {
    profile = await llm.distillUserProfile(round.transcript, profile);
    scores.push(
      scoreProfileTopicMatch(profile, evalCase.cumulativeMatchTopics),
    );
  }

  return {
    caseId: evalCase.id,
    scores,
    topics: evalCase.cumulativeMatchTopics,
  };
}

export function formatEvolutionEvalReport(report: EvolutionEvalReport): string {
  const curve = report.scores
    .map((score, index) => `  r${index + 1}=${(score * 100).toFixed(0)}%`)
    .join("\n");
  return [
    `evolution(${report.caseId}) topics=[${report.topics.join(", ")}]`,
    curve,
    `  non-decreasing=${isNonDecreasing(report.scores)}`,
  ].join("\n");
}
