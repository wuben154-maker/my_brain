import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { createWorldItemStore } from "@/domain/radar/worldItemStore";
import { buildDailyBriefing } from "@/radar/selectDailyBriefing";
import { rankWorldItems } from "@/radar/scoreWorldItems";
import {
  RADAR_FIXTURE_WORLD_ITEMS,
  RADAR_SHOWCASE_NOW,
} from "@/radar/worldSources/fixtureWorldSource";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";
import { useBriefingStore } from "@/stores/briefingStore";

function rankActiveFixture() {
  const store = createWorldItemStore();
  store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS);
  store.expire(RADAR_SHOWCASE_NOW);
  return rankWorldItems({
    graph: SHOWCASE_GRAPH_SNAPSHOT,
    profile: DEFAULT_USER_PROFILE,
    items: store.listActive(),
  });
}

describe("briefingStore", () => {
  it("records feedback in session without persisting elsewhere", () => {
    useBriefingStore.getState().clear();
    useBriefingStore.getState().recordFeedback({
      kind: "too_shallow",
      worldItemId: "radar-wi-rel-1",
      at: RADAR_SHOWCASE_NOW,
    });

    const feedback = useBriefingStore
      .getState()
      .getFeedbackForItem("radar-wi-rel-1");
    expect(feedback).toHaveLength(1);
    expect(feedback[0]?.kind).toBe("too_shallow");
  });

  it("uses not_interested feedback to change the next mock top3", () => {
    useBriefingStore.getState().clear();
    const ranked = rankActiveFixture();
    const firstTop1 = ranked[0]!.item.id;

    useBriefingStore.getState().recordFeedback({
      kind: "not_interested",
      worldItemId: firstTop1,
      at: RADAR_SHOWCASE_NOW,
    });

    const nextBriefing = buildDailyBriefing({
      ranked,
      feedbackByItemId: useBriefingStore.getState().feedbackByItemId,
    });

    expect(nextBriefing[0]!.worldItem.id).not.toBe(firstTop1);
  });

  it("clears today items and feedback", () => {
    useBriefingStore.getState().setTodayItems([]);
    useBriefingStore.getState().recordFeedback({
      kind: "already_know",
      worldItemId: "radar-wi-rel-2",
    });
    useBriefingStore.getState().clear();
    expect(useBriefingStore.getState().todayItems).toEqual([]);
    expect(useBriefingStore.getState().feedbackByItemId).toEqual({});
  });
});
