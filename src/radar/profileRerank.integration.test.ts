import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { rankWorldItems } from "@/radar/scoreWorldItems";
import {
  RADAR_FIXTURE_WORLD_ITEMS,
  RADAR_SHOWCASE_NOW,
} from "@/radar/worldSources/fixtureWorldSource";
import { createWorldItemStore } from "@/domain/radar/worldItemStore";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";
import { useProfileStore } from "@/stores/profileStore";

const REALTIME_FIXTURE_ID = "radar-wi-rel-1";

function activeFixtureItems() {
  const store = createWorldItemStore();
  store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS);
  store.expire(RADAR_SHOWCASE_NOW);
  return store.listActive();
}

function rankIndex(ids: string[], targetId: string): number {
  return ids.indexOf(targetId);
}

describe("profileRerank.integration", () => {
  it("boosting voice_realtime weight raises radar-wi-rel-1 rank by at least 2", async () => {
    useProfileStore.getState().reset();
    const graph = SHOWCASE_GRAPH_SNAPSHOT;
    const items = activeFixtureItems();

    const lowWeightProfile = {
      ...DEFAULT_USER_PROFILE,
      interestEntries: DEFAULT_USER_PROFILE.interestEntries?.map((entry) =>
        entry.id === "voice_realtime" ? { ...entry, weight: 0.2 } : entry,
      ),
    };

    const lowRanked = rankWorldItems({
      graph,
      profile: lowWeightProfile,
      items,
    }).map((entry) => entry.item.id);
    const lowIndex = rankIndex(lowRanked, REALTIME_FIXTURE_ID);

    await useProfileStore.getState().applyCorrection(
      { interestWeights: { voice_realtime: 0.9 } },
      null,
    );
    const highWeightProfile = useProfileStore.getState().profile;

    const highRanked = rankWorldItems({
      graph,
      profile: highWeightProfile,
      items,
    }).map((entry) => entry.item.id);
    const highIndex = rankIndex(highRanked, REALTIME_FIXTURE_ID);

    expect(lowIndex).toBeGreaterThanOrEqual(2);
    expect(highIndex).toBeLessThan(lowIndex);
    expect(lowIndex - highIndex).toBeGreaterThanOrEqual(2);
  });

  it("not_interested feedback beats distilled interests on the same topic", () => {
    useProfileStore.getState().reset();
    const graph = SHOWCASE_GRAPH_SNAPSHOT;
    const items = activeFixtureItems();
    const profileWithDistilledInterest = {
      ...DEFAULT_USER_PROFILE,
      interests: [...DEFAULT_USER_PROFILE.interests, "AI Agent"],
    };

    const baseline = rankWorldItems({
      graph,
      profile: profileWithDistilledInterest,
      items,
    });
    const previousTop1 = baseline[0]!.item.id;

    const afterFeedback = rankWorldItems({
      graph,
      profile: profileWithDistilledInterest,
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

    expect(afterFeedback.slice(0, 3).map((entry) => entry.item.id)).not.toContain(
      previousTop1,
    );
  });

  it("profile correction beats not_interested feedback on voice_realtime fixture", async () => {
    useProfileStore.getState().reset();
    const graph = SHOWCASE_GRAPH_SNAPSHOT;
    const items = activeFixtureItems();

    await useProfileStore.getState().applyCorrection(
      { interestWeights: { voice_realtime: 0.9 } },
      null,
    );
    const correctedProfile = useProfileStore.getState().profile;

    const withFeedbackOnly = rankWorldItems({
      graph,
      profile: DEFAULT_USER_PROFILE,
      items,
      feedbackByItemId: {
        [REALTIME_FIXTURE_ID]: [
          {
            kind: "not_interested",
            worldItemId: REALTIME_FIXTURE_ID,
            at: RADAR_SHOWCASE_NOW,
          },
        ],
      },
    });
    expect(
      withFeedbackOnly.slice(0, 3).map((entry) => entry.item.id),
    ).not.toContain(REALTIME_FIXTURE_ID);

    const withCorrectionAndFeedback = rankWorldItems({
      graph,
      profile: correctedProfile,
      items,
      feedbackByItemId: {
        [REALTIME_FIXTURE_ID]: [
          {
            kind: "not_interested",
            worldItemId: REALTIME_FIXTURE_ID,
            at: RADAR_SHOWCASE_NOW,
          },
        ],
      },
    });
    const correctedIndex = rankIndex(
      withCorrectionAndFeedback.map((entry) => entry.item.id),
      REALTIME_FIXTURE_ID,
    );
    expect(correctedIndex).toBeGreaterThanOrEqual(0);
    expect(correctedIndex).toBeLessThan(3);
  });
});
