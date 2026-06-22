import type { AdaptiveSuggestedIntent } from "../domain/adaptiveSignal.js";
import type { UserModeProfile } from "../domain/userMode.js";
import type { LlmProvider, LlmProviderErrorCode } from "../providers/types.js";
import type { RadarHeadline } from "./radarHeadline.js";

export interface RadarRelevanceScore {
  headlineId: string;
  relevance: number;
  explanation: string;
  suggestedIntent: AdaptiveSuggestedIntent;
}

export interface RadarRelevanceBatch {
  scores: RadarRelevanceScore[];
}

const VALID_INTENTS: AdaptiveSuggestedIntent[] = [
  "explain_more",
  "capture",
  "ingest_candidate",
];

function isSuggestedIntent(value: unknown): value is AdaptiveSuggestedIntent {
  return (
    typeof value === "string" &&
    (VALID_INTENTS as string[]).includes(value)
  );
}

function isRadarRelevanceScore(value: unknown): value is RadarRelevanceScore {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.headlineId === "string" &&
    typeof record.relevance === "number" &&
    record.relevance >= 0 &&
    record.relevance <= 1 &&
    typeof record.explanation === "string" &&
    record.explanation.length > 0 &&
    isSuggestedIntent(record.suggestedIntent)
  );
}

export function validateRadarRelevanceBatch(value: unknown): value is RadarRelevanceBatch {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.scores)) {
    return false;
  }
  return record.scores.every(isRadarRelevanceScore);
}

export type RadarScoringResult =
  | { ok: true; scores: RadarRelevanceScore[] }
  | { ok: false; errorCode: LlmProviderErrorCode; message: string };

function buildScoringPrompt(headlines: RadarHeadline[], profile: UserModeProfile): string {
  const headlineLines = headlines
    .map((h) => `- id=${h.id} title=${h.title} summary=${h.summary.slice(0, 120)}`)
    .join("\n");
  return [
    "Score radar headlines for user relevance.",
    `Primary mode: ${profile.primaryMode}`,
    `Secondary modes: ${profile.secondaryModes.join(", ") || "none"}`,
    profile.recentIntent ? `Recent intent: ${profile.recentIntent}` : "",
    "Headlines:",
    headlineLines,
    "Return JSON: { scores: [{ headlineId, relevance (0-1), explanation, suggestedIntent }] }",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function scoreRadarHeadlinesWithLlm(
  llm: LlmProvider,
  headlines: RadarHeadline[],
  profile: UserModeProfile,
): Promise<RadarScoringResult> {
  if (headlines.length === 0) {
    return { ok: true, scores: [] };
  }

  const result = await llm.generateStructuredJson<RadarRelevanceBatch>({
    prompt: buildScoringPrompt(headlines, profile),
    schemaHint: "RadarRelevanceBatch",
    validate: validateRadarRelevanceBatch,
  });

  if (!result.ok) {
    return {
      ok: false,
      errorCode: result.errorCode,
      message: result.message,
    };
  }

  const knownIds = new Set(headlines.map((h) => h.id));
  const filtered = result.value.scores.filter((score) => knownIds.has(score.headlineId));
  if (filtered.length === 0) {
    return {
      ok: false,
      errorCode: "PARSE_ERROR",
      message: "LLM relevance scores did not match any headline ids",
    };
  }

  return { ok: true, scores: filtered };
}

export function defaultFreshnessForHeadline(
  headline: RadarHeadline,
  index: number,
): number {
  if (headline.publishedAt) {
    const ageMs = Date.now() - Date.parse(headline.publishedAt);
    if (!Number.isNaN(ageMs) && ageMs >= 0) {
      const days = ageMs / (1000 * 60 * 60 * 24);
      return Math.max(0.35, Math.min(0.95, 0.95 - days * 0.05));
    }
  }
  return Math.max(0.45, 0.9 - index * 0.08);
}
