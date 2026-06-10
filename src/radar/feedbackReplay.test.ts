import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { snapshotProfile } from "@/domain/profile/userProfile";
import { createWorldItemStore } from "@/domain/radar/worldItemStore";
import {
  buildBriefingTopicKeyByItemId,
  resolveBriefingElaborationDepth,
} from "@/radar/briefingElaboration";
import { runRadarBriefing } from "@/radar/runRadarBriefing";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import { rankWorldItems } from "@/radar/scoreWorldItems";
import {
  RADAR_FIXTURE_WORLD_ITEMS,
  RADAR_SHOWCASE_NOW,
} from "@/radar/worldSources/fixtureWorldSource";
import { createAppProviders } from "@/providers";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";
import {
  createTempStorage,
  reopenStorage,
} from "@/invariants/testStorage";
import { useBriefingStore } from "@/stores/briefingStore";
import { useGraphStore } from "@/stores/graphStore";

function activeFixtureItems() {
  const store = createWorldItemStore();
  store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS);
  store.expire(RADAR_SHOWCASE_NOW);
  return store.listActive();
}

describe("feedbackReplay", () => {
  it("golden replay: not_interested removes item from next top3 after reload", async () => {
    useBriefingStore.getState().clear();
    const ranked = rankWorldItems({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      profile: DEFAULT_USER_PROFILE,
      items: activeFixtureItems(),
    });
    const previousTop1 = ranked[0]!.item.id;
    expect(previousTop1).toBe(RADAR_RANKING_GOLDEN.top3Ids[0]);

    const fixture = createTempStorage();
    try {
      await fixture.storage.init();
      await useBriefingStore.getState().recordFeedback(
        {
          kind: "not_interested",
          worldItemId: previousTop1,
          at: RADAR_SHOWCASE_NOW,
        },
        fixture.storage,
      );
      await fixture.storage.close();

      useBriefingStore.getState().clear();
      const reopened = reopenStorage(fixture.dbPath, fixture.kind);
      await reopened.init();
      await useBriefingStore.getState().loadFromStorage(reopened);

      const replayRanked = rankWorldItems({
        graph: SHOWCASE_GRAPH_SNAPSHOT,
        profile: DEFAULT_USER_PROFILE,
        items: activeFixtureItems(),
        feedbackByItemId: useBriefingStore.getState().feedbackByItemId,
      });
      const nextTop3 = replayRanked.slice(0, 3).map((entry) => entry.item.id);

      expect(nextTop3).not.toContain(previousTop1);
      expect(nextTop3[0]).not.toBe(previousTop1);
      await reopened.close();
    } finally {
      fixture.cleanup();
    }
  });

  it("runRadarBriefing reads persisted feedback on next launch", async () => {
    useBriefingStore.getState().clear();
    useGraphStore.getState().setGraph(SHOWCASE_GRAPH_SNAPSHOT);

    const first = await runRadarBriefing({
      providers: createAppProviders({ openAiApiKey: "" }, { forceMock: true }),
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      profile: DEFAULT_USER_PROFILE,
      now: RADAR_SHOWCASE_NOW,
    });
    const previousTop1 = first.briefingItems[0]!.worldItem.id;

    const fixture = createTempStorage();
    try {
      await fixture.storage.init();
      await useBriefingStore.getState().recordFeedback(
        {
          kind: "already_know",
          worldItemId: previousTop1,
          at: RADAR_SHOWCASE_NOW,
        },
        fixture.storage,
      );
      await fixture.storage.close();

      useBriefingStore.getState().clear();
      const reopened = reopenStorage(fixture.dbPath, fixture.kind);
      await reopened.init();
      await useBriefingStore.getState().loadFromStorage(reopened);

      const second = await runRadarBriefing({
        providers: createAppProviders({ openAiApiKey: "" }, { forceMock: true }),
        graph: SHOWCASE_GRAPH_SNAPSHOT,
        profile: DEFAULT_USER_PROFILE,
        feedbackByItemId: useBriefingStore.getState().feedbackByItemId,
        now: RADAR_SHOWCASE_NOW,
      });

      expect(second.briefingItems.map((item) => item.worldItem.id)).not.toContain(
        previousTop1,
      );
      await reopened.close();
    } finally {
      fixture.cleanup();
    }
  });

  it("too_shallow/too_deep adjust item-topic elaboration without touching profile", async () => {
    const profileBefore = snapshotProfile(DEFAULT_USER_PROFILE);
    const ranked = rankWorldItems({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      profile: DEFAULT_USER_PROFILE,
      items: activeFixtureItems(),
    });
    const signalsByItemId = Object.fromEntries(
      ranked.map((entry) => [entry.item.id, entry.signals]),
    );
    const topicKeyByItemId = buildBriefingTopicKeyByItemId(signalsByItemId);

    const targetId = RADAR_RANKING_GOLDEN.top3Ids[0]!;
    const sameTopicPeer = ranked.find(
      (entry) =>
        entry.item.id !== targetId &&
        buildBriefingTopicKeyByItemId({ [entry.item.id]: entry.signals })[
          entry.item.id
        ] === topicKeyByItemId[targetId],
    );

    const feedbackByItemId = {
      [targetId]: [
        {
          kind: "too_shallow" as const,
          worldItemId: targetId,
          at: RADAR_SHOWCASE_NOW,
        },
      ],
    };

    const targetDepth = resolveBriefingElaborationDepth({
      baseDepth: 0,
      worldItemId: targetId,
      signals: signalsByItemId[targetId] ?? [],
      feedbackByItemId,
      topicKeyByItemId,
    });
    expect(targetDepth).toBe(1);

    if (sameTopicPeer) {
      const peerDepth = resolveBriefingElaborationDepth({
        baseDepth: 0,
        worldItemId: sameTopicPeer.item.id,
        signals: sameTopicPeer.signals,
        feedbackByItemId,
        topicKeyByItemId,
      });
      expect(peerDepth).toBe(1);
    }

    const unrelatedEntry = ranked.find(
      (entry) =>
        entry.item.id !== targetId &&
        (topicKeyByItemId[entry.item.id] ?? "") !== (topicKeyByItemId[targetId] ?? ""),
    );
    if (unrelatedEntry) {
      const unrelatedDepth = resolveBriefingElaborationDepth({
        baseDepth: 0,
        worldItemId: unrelatedEntry.item.id,
        signals: unrelatedEntry.signals,
        feedbackByItemId,
        topicKeyByItemId,
      });
      expect(unrelatedDepth).toBe(0);
    }

    expect(snapshotProfile(DEFAULT_USER_PROFILE)).toEqual(profileBefore);
  });

  it("feedback path does not create knowledge graph nodes", async () => {
    const fixture = createTempStorage();
    try {
      await fixture.storage.init();
      const graphBefore = await fixture.storage.loadGraph();
      await useBriefingStore.getState().recordFeedback(
        {
          kind: "not_interested",
          worldItemId: RADAR_RANKING_GOLDEN.top3Ids[0]!,
          at: RADAR_SHOWCASE_NOW,
        },
        fixture.storage,
      );
      const graphAfter = await fixture.storage.loadGraph();
      expect(graphAfter.nodes).toEqual(graphBefore.nodes);
      expect(graphAfter.edges).toEqual(graphBefore.edges);
      await fixture.storage.close();
    } finally {
      fixture.cleanup();
    }
  });
});
