import { describe, expect, it } from "vitest";
import {
  RADAR_FIXTURE_CATEGORY_COUNTS,
  RADAR_FIXTURE_WORLD_ITEM_CATEGORIES,
  RADAR_FIXTURE_WORLD_ITEMS,
  type RadarFixtureCategory,
} from "@/radar/worldSources/fixtureWorldSource";

describe("RADAR_RANKING_GOLDEN fixture coverage", () => {
  it("includes at least 20 WorldItems across five fixture categories", () => {
    expect(RADAR_FIXTURE_WORLD_ITEMS.length).toBeGreaterThanOrEqual(20);

    const categories = new Set<RadarFixtureCategory>(
      RADAR_FIXTURE_WORLD_ITEM_CATEGORIES.map((entry) => entry.category),
    );
    expect(categories).toEqual(
      new Set<RadarFixtureCategory>(["relevant", "weak", "noise", "duplicate", "stale"]),
    );

    for (const category of categories) {
      expect(RADAR_FIXTURE_CATEGORY_COUNTS[category]).toBeGreaterThan(0);
    }
  });
});
