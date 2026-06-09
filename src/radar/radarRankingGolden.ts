import {
  RADAR_FIXTURE_WORLD_ITEM_CATEGORIES,
  type RadarFixtureCategory,
} from "@/radar/worldSources/fixtureWorldSource";

export interface RadarRankingGolden {
  top3Ids: string[];
  forbiddenInTop3: string[];
  categoryThresholds: Record<"noiseMax" | "weakMin", number>;
}

const forbiddenCategories = new Set<RadarFixtureCategory>(["noise", "duplicate", "stale"]);

export const RADAR_RANKING_GOLDEN: RadarRankingGolden = {
  top3Ids: ["radar-wi-rel-1", "radar-wi-rel-4", "radar-wi-rel-3"],
  forbiddenInTop3: RADAR_FIXTURE_WORLD_ITEM_CATEGORIES
    .filter((item) => forbiddenCategories.has(item.category))
    .map((item) => item.id),
  categoryThresholds: {
    noiseMax: 0.1,
    weakMin: 0.3,
  },
};
