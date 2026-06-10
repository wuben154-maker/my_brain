import { describe, expect, it } from "vitest";
import { fetchArxivCsAiLive } from "@/providers/news/arxivNewsSource";
import { fetchGitHubTrendingLiveSmoke } from "@/providers/news/githubTrendingSource";
import { isLiveSourceSmokeEnabled } from "@/providers/news/newsLiveFetchMode";
import { mapNewsFetchResultToWorldItems } from "@/radar/worldSources/worldSourceAdapter";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { rankWorldItems } from "@/radar/scoreWorldItems";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";

const LIVE_SMOKE_ENABLED = isLiveSourceSmokeEnabled();

describe("liveSourceSmoke", () => {
  it.skipIf(!LIVE_SMOKE_ENABLED)(
    "fetches GitHub public API and ranks live WorldItems",
    async () => {
      const fetchResult = await fetchGitHubTrendingLiveSmoke();
      expect(fetchResult.items.length).toBeGreaterThan(0);

      const worldItems = mapNewsFetchResultToWorldItems(fetchResult);
      expect(worldItems.length).toBeGreaterThan(0);

      const ranked = rankWorldItems({
        graph: SHOWCASE_GRAPH_SNAPSHOT,
        profile: DEFAULT_USER_PROFILE,
        items: worldItems,
      });
      expect(ranked.length).toBeGreaterThan(0);
    },
    30_000,
  );

  it.skipIf(!LIVE_SMOKE_ENABLED)(
    "fetches arXiv cs.AI atom feed",
    async () => {
      const fetchResult = await fetchArxivCsAiLive();
      expect(fetchResult.items.length).toBeGreaterThan(0);
      expect(fetchResult.items[0]?.sourceName).toBe("arXiv cs.AI");
    },
    30_000,
  );

  it("skips live network fetch unless KP01_LIVE_SOURCE_SMOKE=1", () => {
    expect(LIVE_SMOKE_ENABLED).toBe(process.env.KP01_LIVE_SOURCE_SMOKE === "1");
  });
});
