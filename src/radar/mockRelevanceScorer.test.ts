import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { MockRelevanceScorer } from "@/radar/mockRelevanceScorer";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import { rankWorldItems } from "@/radar/scoreWorldItems";
import {
  RADAR_FIXTURE_WORLD_ITEM_CATEGORIES,
  RADAR_FIXTURE_WORLD_ITEMS,
  RADAR_SHOWCASE_NOW,
  type RadarFixtureCategory,
} from "@/radar/worldSources/fixtureWorldSource";
import { createWorldItemStore } from "@/domain/radar/worldItemStore";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";

function activeFixtureItems() {
  const store = createWorldItemStore();
  store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS);
  store.expire(RADAR_SHOWCASE_NOW);
  return store.listActive();
}

function itemsByCategory(category: RadarFixtureCategory) {
  const ids = new Set(
    RADAR_FIXTURE_WORLD_ITEM_CATEGORIES.filter((entry) => entry.category === category).map(
      (entry) => entry.id,
    ),
  );
  return RADAR_FIXTURE_WORLD_ITEMS.filter((item) => ids.has(item.id));
}

describe("MockRelevanceScorer", () => {
  const scorer = new MockRelevanceScorer();
  const graph = SHOWCASE_GRAPH_SNAPSHOT;
  const profile = {
    ...DEFAULT_USER_PROFILE,
    interestEntries: undefined,
  };

  it("scores relevant fixture items above weak and noise thresholds", () => {
    const relevantScores = itemsByCategory("relevant").map(
      (item) => scorer.score({ graph, profile, item }).score,
    );

    expect(relevantScores.every((score) => score > RADAR_RANKING_GOLDEN.categoryThresholds.weakMin)).toBe(
      true,
    );
    expect(Math.min(...relevantScores)).toBeGreaterThan(RADAR_RANKING_GOLDEN.categoryThresholds.noiseMax);
  });

  it("scores weak fixture items at or above weakMin", () => {
    const weakScores = itemsByCategory("weak").map((item) => scorer.score({ graph, profile, item }).score);

    expect(weakScores.every((score) => score >= RADAR_RANKING_GOLDEN.categoryThresholds.weakMin)).toBe(
      true,
    );
  });

  it("scores noise fixture items below weakMin and noiseMax", () => {
    const noiseScores = itemsByCategory("noise").map((item) => scorer.score({ graph, profile, item }).score);
    const weakScores = itemsByCategory("weak").map((item) => scorer.score({ graph, profile, item }).score);

    expect(noiseScores.every((score) => score < RADAR_RANKING_GOLDEN.categoryThresholds.weakMin)).toBe(
      true,
    );
    expect(noiseScores.every((score) => score <= RADAR_RANKING_GOLDEN.categoryThresholds.noiseMax)).toBe(
      true,
    );
    expect(Math.max(...noiseScores)).toBeLessThan(Math.min(...weakScores));
  });

  it("returns zero signals for expired stale and superseded duplicate store rows", () => {
    const store = createWorldItemStore();
    store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS);
    store.expire(RADAR_SHOWCASE_NOW);

    const inactive = store
      .listAll()
      .filter(
        (item) =>
          item.status === "expired" ||
          (item.status === "superseded" && item.id.startsWith("radar-wi-dup-")),
      );

    expect(inactive.some((item) => item.id.startsWith("radar-wi-stale-"))).toBe(true);
    expect(inactive.some((item) => item.status === "superseded")).toBe(true);

    for (const item of inactive) {
      const scored = scorer.score({ graph, profile, item });
      expect(scored.score).toBe(0);
      expect(scored.signals).toEqual([]);
    }
  });

  it("keeps forbidden categories out of top3 for the active fixture pool", () => {
    const ranked = rankWorldItems({
      graph,
      profile,
      items: activeFixtureItems(),
    });
    const top3Ids = ranked.slice(0, 3).map((entry) => entry.item.id);

    expect(top3Ids).toEqual(RADAR_RANKING_GOLDEN.top3Ids);
    for (const forbiddenId of RADAR_RANKING_GOLDEN.forbiddenInTop3) {
      expect(top3Ids).not.toContain(forbiddenId);
    }
  });

  it("is deterministic for the same graph, profile, and item", () => {
    const item = RADAR_FIXTURE_WORLD_ITEMS.find((entry) => entry.id === "radar-wi-rel-1");
    expect(item).toBeDefined();

    const first = scorer.score({ graph, profile, item: item! });
    const second = scorer.score({ graph, profile, item: item! });

    expect(second).toEqual(first);
  });
});
