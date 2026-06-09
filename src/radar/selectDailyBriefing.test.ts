import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { createWorldItemStore } from "@/domain/radar/worldItemStore";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import { rankWorldItems } from "@/radar/scoreWorldItems";
import {
  applyBriefingFeedbackToRanked,
  buildDailyBriefing,
  selectDailyBriefing,
} from "@/radar/selectDailyBriefing";
import {
  RADAR_FIXTURE_WORLD_ITEMS,
  RADAR_SHOWCASE_NOW,
} from "@/radar/worldSources/fixtureWorldSource";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";

function activeFixtureRanked() {
  const store = createWorldItemStore();
  store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS);
  store.expire(RADAR_SHOWCASE_NOW);
  return rankWorldItems({
    graph: SHOWCASE_GRAPH_SNAPSHOT,
    profile: DEFAULT_USER_PROFILE,
    items: store.listActive(),
  });
}

describe("selectDailyBriefing", () => {
  it("selects max=3 with deterministic briefing ranks", () => {
    const ranked = activeFixtureRanked();
    const briefing = selectDailyBriefing(ranked, { max: 3 });

    expect(briefing).toHaveLength(3);
    expect(briefing.map((item) => item.worldItem.id)).toEqual(
      RADAR_RANKING_GOLDEN.top3Ids,
    );
    expect(briefing.map((item) => item.briefingRank)).toEqual([1, 2, 3]);
    for (const item of briefing) {
      expect(item.signals.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("tie-breaks equal scores by world item id", () => {
    const ranked = activeFixtureRanked();
    const tied = ranked.map((entry) => ({ ...entry, score: 0.5 }));
    const first = selectDailyBriefing(tied, { max: 3 });
    const second = selectDailyBriefing(tied, { max: 3 });
    expect(first.map((item) => item.worldItem.id)).toEqual(
      second.map((item) => item.worldItem.id),
    );
  });

  it("excludes not_interested items on rerank", () => {
    const ranked = activeFixtureRanked();
    const previousTop1 = ranked[0]!.item.id;
    const adjusted = applyBriefingFeedbackToRanked(ranked, {
      [previousTop1]: [
        {
          kind: "not_interested",
          worldItemId: previousTop1,
          at: RADAR_SHOWCASE_NOW,
        },
      ],
    });
    const briefing = buildDailyBriefing({
      ranked: adjusted,
      feedbackByItemId: {
        [previousTop1]: [
          {
            kind: "not_interested",
            worldItemId: previousTop1,
            at: RADAR_SHOWCASE_NOW,
          },
        ],
      },
    });

    expect(briefing[0]!.worldItem.id).not.toBe(previousTop1);
    expect(briefing.map((item) => item.worldItem.id)).not.toContain(previousTop1);
  });
});
