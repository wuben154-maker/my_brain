import type { BrainGraphSnapshot } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import {
  assertRadarSignal,
  type RadarSignal,
  type ScoreWorldItemsResult,
  type WorldItemScored,
} from "@/domain/radar/radarSignal";
import type { WorldItem } from "@/domain/radar/worldItem";
import { MockRelevanceScorer, type RelevanceScorer } from "@/radar/mockRelevanceScorer";

export interface ScoreWorldItemsInput {
  graph: BrainGraphSnapshot;
  profile: UserProfile;
  items: WorldItem[];
  scorer?: RelevanceScorer;
}

export function scoreWorldItems(input: ScoreWorldItemsInput): ScoreWorldItemsResult {
  const scorer = input.scorer ?? new MockRelevanceScorer();
  const scored = input.items
    .map((item) => scorer.score({ graph: input.graph, profile: input.profile, item }))
    .map((entry) => normalizeScoredEntry(entry, input.graph));

  const ranked = sortRanked(scored);
  return {
    ranked,
    signalsByItemId: Object.fromEntries(
      ranked.map((entry) => [entry.item.id, entry.signals]),
    ),
  };
}

export function rankWorldItems(input: ScoreWorldItemsInput): WorldItemScored[] {
  return scoreWorldItems(input).ranked;
}

function normalizeScoredEntry(
  entry: WorldItemScored,
  graph: BrainGraphSnapshot,
): WorldItemScored {
  const signals: RadarSignal[] = entry.signals.map((signal) => {
    assertRadarSignal(signal, graph);
    return {
      ...signal,
      score: clamp01(signal.score),
    };
  });
  return {
    ...entry,
    score: clamp01(entry.score),
    signals,
  };
}

function sortRanked(entries: WorldItemScored[]): WorldItemScored[] {
  return [...entries].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.item.id.localeCompare(right.item.id);
  });
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}
