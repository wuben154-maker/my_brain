import { describe, expect, it } from "vitest";
import { createWorldItemStore } from "@/domain/radar/worldItemStore";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import { scoreWorldItems } from "@/radar/scoreWorldItems";
import {
  RADAR_FIXTURE_WORLD_ITEMS,
  RADAR_SHOWCASE_NOW,
} from "@/radar/worldSources/fixtureWorldSource";
import {
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_WORLD_ITEMS,
} from "@/showcase/showcaseFixtures";

function activeFixtureItems() {
  const store = createWorldItemStore();
  store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS);
  store.expire(RADAR_SHOWCASE_NOW);
  return store.listActive();
}

describe("scoreWorldItems", () => {
  it("ranks fixture WorldItems against the KOS-B2 golden top3", () => {
    const result = scoreWorldItems({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      profile: DEFAULT_USER_PROFILE,
      items: activeFixtureItems(),
    });

    const top3Ids = result.ranked.slice(0, 3).map((entry) => entry.item.id);
    expect(top3Ids).toEqual(RADAR_RANKING_GOLDEN.top3Ids);
    for (const id of RADAR_RANKING_GOLDEN.forbiddenInTop3) {
      expect(top3Ids).not.toContain(id);
    }
  });

  it("returns explainable signals for every top3 item with valid graph links", () => {
    const result = scoreWorldItems({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      profile: DEFAULT_USER_PROFILE,
      items: activeFixtureItems(),
    });
    const graphNodeIds = new Set(SHOWCASE_GRAPH_SNAPSHOT.nodes.map((node) => node.id));

    for (const entry of result.ranked.slice(0, 3)) {
      expect(entry.signals.length).toBeGreaterThanOrEqual(1);
      for (const signal of entry.signals) {
        expect(signal.explanation.trim()).not.toBe("");
        expect([...signal.explanation].length).toBeLessThanOrEqual(120);
        for (const nodeId of signal.linkedNodeIds) {
          expect(graphNodeIds.has(nodeId)).toBe(true);
        }
      }
    }
  });

  it("excludes not_interested feedback from top3 ranking", () => {
    const items = activeFixtureItems();
    const baseline = scoreWorldItems({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      profile: DEFAULT_USER_PROFILE,
      items,
    });
    const previousTop1 = baseline.ranked[0]!.item.id;

    const adjusted = scoreWorldItems({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      profile: DEFAULT_USER_PROFILE,
      items,
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

    const top3Ids = adjusted.ranked.slice(0, 3).map((entry) => entry.item.id);
    expect(top3Ids).not.toContain(previousTop1);
  });

  it("keeps showcase WorldItems in the top5 of the full mock radar pool", () => {
    const result = scoreWorldItems({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      profile: DEFAULT_USER_PROFILE,
      items: [...activeFixtureItems(), ...SHOWCASE_WORLD_ITEMS],
    });

    const top5Ids = result.ranked.slice(0, 5).map((entry) => entry.item.id);
    expect(top5Ids).toEqual(
      expect.arrayContaining([
        "radar-wi-showcase-1",
        "radar-wi-showcase-2",
        "radar-wi-showcase-3",
      ]),
    );
  });
});
