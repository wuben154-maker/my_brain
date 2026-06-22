import type { AdaptiveSignal } from "../domain/adaptiveSignal.js";
import type { UserModeProfile } from "../domain/userMode.js";
import type { LlmProvider } from "../providers/types.js";
import {
  generateAdaptiveSignals,
  rankAdaptiveSignals,
} from "./adaptiveRadar.js";
import { fetchGitHubTrendingHeadlines } from "./githubTrendingSource.js";
import {
  defaultFreshnessForHeadline,
  scoreRadarHeadlinesWithLlm,
  type RadarRelevanceScore,
} from "./radarRelevanceScoring.js";
import { degradedReasonFromFetchError, type RadarFetch } from "./radarFetch.js";
import type { RadarHeadline } from "./radarHeadline.js";

export type LiveRadarMode = "mock" | "live" | "degraded";

export interface LiveRadarResult {
  signals: AdaptiveSignal[];
  mode: LiveRadarMode;
  degradedReasons: string[];
  sourceKind: "fixture" | "live";
}

export interface LiveRadarOptions {
  fetch: RadarFetch;
  llm: LlmProvider;
  profile: UserModeProfile;
  suppressionList?: string[];
  /** When false, skip network and return fixture-only signals (offline / no-key). */
  liveEnabled?: boolean;
}

function sourceTypeForProfile(profile: UserModeProfile): AdaptiveSignal["sourceType"] {
  if (profile.primaryMode === "tech_tracker") {
    return "radar";
  }
  if (profile.primaryMode === "learner") {
    return "learning";
  }
  if (profile.primaryMode === "personal_memory") {
    return "capture";
  }
  return "project";
}

function headlineToAdaptiveSignal(
  headline: RadarHeadline,
  profile: UserModeProfile,
  score: RadarRelevanceScore | undefined,
  index: number,
): AdaptiveSignal {
  const freshness = score?.relevance ?? defaultFreshnessForHeadline(headline, index);
  const confidence = score?.relevance ?? (headline.sourceKind === "fixture" ? 0.75 : 0.68);

  return {
    sourceType: sourceTypeForProfile(profile),
    userModeFit: profile.primaryMode,
    freshness,
    evidenceRefs: [
      `radar:${headline.sourceKind}:${headline.id}`,
      `source:${headline.sourceId}`,
      `url:${headline.sourceUrl}`,
    ],
    confidence,
    privacyLevel: "local_only",
    suggestedIntent: score?.suggestedIntent ?? "explain_more",
  };
}

function applySuppression(
  signals: AdaptiveSignal[],
  suppressionList: string[],
): AdaptiveSignal[] {
  return signals.filter((signal) => !suppressionList.includes(`mode-${signal.userModeFit}`));
}

export async function fetchLiveRadarSignals(
  options: LiveRadarOptions,
): Promise<LiveRadarResult> {
  const {
    fetch,
    llm,
    profile,
    suppressionList = [],
    liveEnabled = false,
  } = options;

  if (!liveEnabled) {
    return {
      signals: generateAdaptiveSignals(profile, suppressionList),
      mode: "mock",
      degradedReasons: ["fixture_radar:offline_or_no_key"],
      sourceKind: "fixture",
    };
  }

  const degradedReasons: string[] = [];
  let headlines: RadarHeadline[];

  try {
    headlines = await fetchGitHubTrendingHeadlines(fetch);
  } catch (error) {
    degradedReasons.push(degradedReasonFromFetchError(error));
    return {
      signals: generateAdaptiveSignals(profile, suppressionList),
      mode: "degraded",
      degradedReasons,
      sourceKind: "fixture",
    };
  }

  const scoring = await scoreRadarHeadlinesWithLlm(llm, headlines, profile);
  const scoreById = new Map<string, RadarRelevanceScore>();
  if (scoring.ok) {
    for (const score of scoring.scores) {
      scoreById.set(score.headlineId, score);
    }
  } else {
    degradedReasons.push(`llm_scoring_${scoring.errorCode.toLowerCase()}:${scoring.message}`);
  }

  const rawSignals = headlines
    .slice(0, 5)
    .map((headline, index) =>
      headlineToAdaptiveSignal(headline, profile, scoreById.get(headline.id), index),
    );

  const filtered = applySuppression(rawSignals, suppressionList);
  const signals = rankAdaptiveSignals(filtered).slice(0, 3);

  return {
    signals,
    mode: scoring.ok ? "live" : "degraded",
    degradedReasons,
    sourceKind: "live",
  };
}
