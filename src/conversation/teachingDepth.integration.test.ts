import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { buildBriefingTopicKeyByItemId } from "@/radar/briefingElaboration";
import { rankWorldItems } from "@/radar/scoreWorldItems";
import {
  RADAR_FIXTURE_WORLD_ITEMS,
  RADAR_SHOWCASE_NOW,
} from "@/radar/worldSources/fixtureWorldSource";
import { createWorldItemStore } from "@/domain/radar/worldItemStore";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";
import { nextTurn } from "@/conversation/nextTurn";
import {
  buildTeachingTurn,
  profileBaseElaborationDepth,
  resolveTeachingElaborationDepth,
  teachingTurnIncludesBasicDefinition,
} from "@/conversation/teachingDepth";
import { DEFAULT_ONBOARDING } from "@/conversation/types";

function activeFixtureItems() {
  const store = createWorldItemStore();
  store.upsertMany(RADAR_FIXTURE_WORLD_ITEMS);
  store.expire(RADAR_SHOWCASE_NOW);
  return store.listActive();
}

describe("teachingDepth integration", () => {
  it("profile correction raises base elaboration depth for demo-rag", () => {
    const heardDepth = profileBaseElaborationDepth(DEFAULT_USER_PROFILE, "demo-rag");
    const correctedProfile = {
      ...DEFAULT_USER_PROFILE,
      understanding: { "demo-rag": "can_explain" as const },
      correctedFields: ["understanding.demo-rag"],
    };
    const correctedDepth = profileBaseElaborationDepth(
      correctedProfile,
      "demo-rag",
    );
    expect(correctedDepth).toBeGreaterThan(heardDepth);
  });

  it("too_shallow feedback increases resolved teaching depth without mutating profile", () => {
    const ranked = rankWorldItems({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      profile: DEFAULT_USER_PROFILE,
      items: activeFixtureItems(),
    });
    const target = ranked[0]!;
    const signalsByItemId = { [target.item.id]: target.signals };
    const topicKeyByItemId = buildBriefingTopicKeyByItemId(signalsByItemId);
    const conceptId = target.signals[0]?.linkedNodeIds[0] ?? "demo-rag";

    const baseOnly = resolveTeachingElaborationDepth({
      profile: DEFAULT_USER_PROFILE,
      conceptId,
      worldItemId: target.item.id,
      signals: target.signals,
      feedbackByItemId: {},
      topicKeyByItemId,
    });

    const withFeedback = resolveTeachingElaborationDepth({
      profile: DEFAULT_USER_PROFILE,
      conceptId,
      worldItemId: target.item.id,
      signals: target.signals,
      feedbackByItemId: {
        [target.item.id]: [
          {
            kind: "too_shallow",
            worldItemId: target.item.id,
            at: RADAR_SHOWCASE_NOW,
          },
        ],
      },
      topicKeyByItemId,
    });

    expect(withFeedback).toBe(baseOnly + 1);
  });

  it("conductor nextTurn topicRequest uses buildTeachingTurn for RAG topics", async () => {
    const llm = createMockLlmProvider();
    const ctx = {
      newsQueue: [],
      newsCursor: 0,
      graph: SHOWCASE_GRAPH_SNAPSHOT,
      profile: {
        ...DEFAULT_USER_PROFILE,
        understanding: { "demo-rag": "can_explain" as const },
      },
      personaId: "mentor",
      onboarding: DEFAULT_ONBOARDING,
    };

    const turn = await nextTurn(
      "idle_chat",
      { type: "topicRequest", topic: "讲讲 RAG" },
      ctx,
      llm,
    );

    const expected = buildTeachingTurn("demo-rag", ctx.profile);
    expect(turn.say).toContain(expected.slice(0, 20));
    expect(teachingTurnIncludesBasicDefinition(turn.say)).toBe(false);
    expect(turn.nextState).toBe("teaching");
  });
});
