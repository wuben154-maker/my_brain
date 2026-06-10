import type { BrainGraphSnapshot } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";
import {
  briefingItemToNewsItem,
  type BriefingFeedback,
  type BriefingItem,
} from "@/domain/radar/briefingItem";
import type { WorldItemStore } from "@/domain/radar/worldItemStore";
import type { UserProfile } from "@/domain/profile";
import type { AppProviders } from "@/providers";
import { selectDailyBriefing } from "@/radar/selectDailyBriefing";
import { rankWorldItems } from "@/radar/scoreWorldItems";
import { runWorldIngest } from "@/radar/runWorldIngest";
import { RADAR_SHOWCASE_NOW } from "@/radar/worldSources/fixtureWorldSource";

export interface RunRadarBriefingInput {
  providers: AppProviders;
  graph: BrainGraphSnapshot;
  profile: UserProfile;
  feedbackByItemId?: Record<string, BriefingFeedback[]>;
  warn?: (message: string) => void;
  now?: string;
}

export interface RunRadarBriefingResult {
  store: WorldItemStore;
  briefingItems: BriefingItem[];
  newsQueue: NewsItem[];
  warnings: string[];
}

export async function runRadarBriefing(
  input: RunRadarBriefingInput,
): Promise<RunRadarBriefingResult> {
  let ingest = await runWorldIngest({
    source: input.providers.news,
    fallbackToFixture: true,
    now: input.now ?? RADAR_SHOWCASE_NOW,
    warn: input.warn,
  });

  if (ingest.activeItems.length === 0) {
    input.warn?.("World ingest returned no active items; falling back to fixture source");
    ingest = await runWorldIngest({
      source: "fixture",
      store: ingest.store,
      fallbackToFixture: false,
      now: input.now ?? RADAR_SHOWCASE_NOW,
      warn: input.warn,
    });
  }

  const ranked = rankWorldItems({
    graph: input.graph,
    profile: input.profile,
    items: ingest.activeItems,
    feedbackByItemId: input.feedbackByItemId ?? {},
  });

  const briefingItems = selectDailyBriefing(ranked, { max: 3 });

  return {
    store: ingest.store,
    briefingItems,
    newsQueue: briefingItems.map(briefingItemToNewsItem),
    warnings: ingest.warnings,
  };
}
