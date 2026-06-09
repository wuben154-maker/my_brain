import { describe, expect, it } from "vitest";
import { createWorldItemStore } from "@/domain/radar/worldItemStore";
import {
  RADAR_ACTIVE_GOLDEN_COUNT,
  RADAR_DUPLICATE_GOLDEN_COUNT,
  RADAR_FIXTURE_WORLD_ITEMS,
  RADAR_SHOWCASE_NOW,
} from "@/radar/worldSources/fixtureWorldSource";

describe("WorldItemStore", () => {
  it("upserts fixture items, supersedes duplicates, and expires stale items without deleting", () => {
    const store = createWorldItemStore();

    store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS);
    const expired = store.expire(RADAR_SHOWCASE_NOW);

    expect(store.listAll()).toHaveLength(20);
    expect(store.listActive()).toHaveLength(RADAR_ACTIVE_GOLDEN_COUNT);
    expect(store.listAll().filter((item) => item.duplicateOf !== null)).toHaveLength(
      RADAR_DUPLICATE_GOLDEN_COUNT,
    );
    expect(expired).toHaveLength(4);
    expect(store.listAll().filter((item) => item.status === "expired")).toHaveLength(4);
    expect(store.listActive().some((item) => item.id.startsWith("radar-wi-stale-"))).toBe(
      false,
    );
  });

  it("dedupes by canonical URL and preserves the superseded item", () => {
    const store = createWorldItemStore();
    const canonical = RADAR_FIXTURE_WORLD_ITEMS.find((item) => item.id === "radar-wi-dup-1");
    const duplicate = RADAR_FIXTURE_WORLD_ITEMS.find((item) => item.id === "radar-wi-dup-2");

    if (!canonical || !duplicate) {
      throw new Error("duplicate fixture missing");
    }

    expect(store.upsert(canonical).duplicateOf).toBeNull();
    const result = store.upsert(duplicate);

    expect(result.duplicateOf).toBe("radar-wi-dup-1");
    expect(store.get("radar-wi-dup-2")?.status).toBe("superseded");
    expect(store.listAll()).toHaveLength(2);
    expect(store.listActive()).toHaveLength(1);
  });

  it("can rerun dedupe after external status changes", () => {
    const store = createWorldItemStore();
    store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS.slice(13, 16));

    const updated = store.dedupe();

    expect(updated).toHaveLength(2);
    expect(store.listActive()).toHaveLength(1);
    expect(store.listAll()).toHaveLength(3);
  });
});
