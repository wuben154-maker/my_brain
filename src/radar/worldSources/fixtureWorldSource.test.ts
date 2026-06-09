import { describe, expect, it } from "vitest";
import { createWorldItemStore } from "@/domain/radar/worldItemStore";
import {
  fixtureWorldSource,
  RADAR_ACTIVE_GOLDEN_COUNT,
  RADAR_DUPLICATE_GOLDEN_COUNT,
  RADAR_FIXTURE_CATEGORY_COUNTS,
  RADAR_FIXTURE_NOW,
  RADAR_FIXTURE_WORLD_ITEM_CATEGORIES,
  RADAR_FIXTURE_WORLD_ITEMS,
  RADAR_SHOWCASE_NOW,
} from "@/radar/worldSources/fixtureWorldSource";
import { runWorldIngest } from "@/radar/runWorldIngest";

describe("fixtureWorldSource", () => {
  it("exports 20 stable WorldItem fixtures across five categories", () => {
    expect(RADAR_FIXTURE_WORLD_ITEMS).toHaveLength(20);
    expect(RADAR_FIXTURE_WORLD_ITEM_CATEGORIES).toHaveLength(20);
    expect(RADAR_FIXTURE_WORLD_ITEMS.every((item) => item.id.startsWith("radar-wi-"))).toBe(
      true,
    );
    expect(RADAR_FIXTURE_WORLD_ITEMS.filter((item) => item.fetchedAt === RADAR_FIXTURE_NOW))
      .toHaveLength(16);

    const counts = RADAR_FIXTURE_WORLD_ITEM_CATEGORIES.reduce(
      (acc, item) => ({ ...acc, [item.category]: acc[item.category] + 1 }),
      { ...RADAR_FIXTURE_CATEGORY_COUNTS, relevant: 0, weak: 0, noise: 0, duplicate: 0, stale: 0 },
    );
    expect(counts).toEqual(RADAR_FIXTURE_CATEGORY_COUNTS);
    expect(JSON.stringify(RADAR_FIXTURE_WORLD_ITEMS)).toContain("radar-wi-rel-1");
  });

  it("returns cloned fixtures without live network dependencies", async () => {
    const first = await fixtureWorldSource.fetchWorldItems();
    const second = await fixtureWorldSource.fetchWorldItems();

    expect(first).toEqual(RADAR_FIXTURE_WORLD_ITEMS);
    expect(first).not.toBe(RADAR_FIXTURE_WORLD_ITEMS);
    expect(first[0]).not.toBe(second[0]);
  });

  it("matches KOS-B1 active and duplicate golden counts after ingest", async () => {
    const result = await runWorldIngest({
      source: "fixture",
      store: createWorldItemStore(),
      now: RADAR_SHOWCASE_NOW,
    });

    expect(result.fetchedItems).toHaveLength(20);
    expect(result.activeItems).toHaveLength(RADAR_ACTIVE_GOLDEN_COUNT);
    expect(result.store.listAll().filter((item) => item.duplicateOf !== null)).toHaveLength(
      RADAR_DUPLICATE_GOLDEN_COUNT,
    );
    expect(result.expiredItems).toHaveLength(4);
  });

  it("falls back to fixture source when a live source fails", async () => {
    const warnings: string[] = [];
    const result = await runWorldIngest({
      source: {
        id: "broken-live-world",
        label: "Broken Live World",
        async fetchWorldItems() {
          throw new Error("live unavailable");
        },
      },
      now: RADAR_SHOWCASE_NOW,
      warn: (message) => warnings.push(message),
    });

    expect(result.activeItems).toHaveLength(RADAR_ACTIVE_GOLDEN_COUNT);
    expect(warnings).toEqual([
      "World ingest source failed: live unavailable",
      "World ingest falling back to fixture source",
    ]);
  });
});
