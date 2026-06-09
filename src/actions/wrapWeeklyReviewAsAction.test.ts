import { describe, expect, it } from "vitest";
import { buildWeeklyBrainReview } from "@/cognitive/buildWeeklyBrainReview";
import {
  WEEKLY_REVIEW_FIXTURE_HISTORY,
  WEEKLY_REVIEW_FIXTURE_PROFILE,
  WEEKLY_REVIEW_FIXTURE_TRACES,
  WEEKLY_REVIEW_GOLDEN,
  WEEKLY_REVIEW_W22_RANGE,
} from "@/cognitive/weeklyReviewGolden";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
} from "@/showcase/showcaseFixtures";
import {
  COGNITIVE_ACTION_GOLDEN,
  COGNITIVE_ACTION_WEEKLY_REVIEW_ID,
  cognitiveActionMatchesGolden,
  freezeCognitiveActionGoldenBodyHash,
  wrapWeeklyReviewAsAction,
} from "@/actions/wrapWeeklyReviewAsAction";
import { bodyMarkdownPrefixHash } from "@/domain/actions/cognitiveAction";

function fixtureGraph() {
  const graph = createShowcaseGraphSnapshot();
  graph.nodes.push(showcaseIngestNodeFromGraph());
  return graph;
}

describe("wrapWeeklyReviewAsAction", () => {
  it("wraps D3 review into draft weekly_review action matching golden", () => {
    const review = buildWeeklyBrainReview({
      graph: fixtureGraph(),
      history: WEEKLY_REVIEW_FIXTURE_HISTORY,
      traces: WEEKLY_REVIEW_FIXTURE_TRACES,
      profile: WEEKLY_REVIEW_FIXTURE_PROFILE,
      weekRange: WEEKLY_REVIEW_W22_RANGE,
      generatedAt: WEEKLY_REVIEW_W22_RANGE.end,
    });

    const action = wrapWeeklyReviewAsAction(review, {
      id: COGNITIVE_ACTION_WEEKLY_REVIEW_ID,
      createdAt: WEEKLY_REVIEW_W22_RANGE.end,
    });

    expect(action.kind).toBe("weekly_review");
    expect(action.status).toBe("draft");
    expect(action.permissionLevel).toBe("suggest");
    expect(action.bodyMarkdown).toBe(review.markdown);
    expect(action.bodyMarkdown.startsWith(`# 每周脑图回顾 · ${WEEKLY_REVIEW_GOLDEN.weekId}`)).toBe(
      true,
    );

    const goldenWithHash = {
      ...COGNITIVE_ACTION_GOLDEN,
      bodyMarkdownPrefixHash: freezeCognitiveActionGoldenBodyHash(action),
    };
    expect(cognitiveActionMatchesGolden(action, goldenWithHash)).toBe(true);

    const historyCitations = action.citations.filter((c) => c.type === "historyEntry");
    const nodeCitations = action.citations.filter((c) => c.type === "node");
    expect(historyCitations.length).toBeGreaterThanOrEqual(1);
    expect(nodeCitations.length).toBeGreaterThanOrEqual(1);
    expect(
      action.citations.some(
        (c) => c.type === "historyEntry" && c.id === "weekly-fixture-create-graphiti",
      ),
    ).toBe(true);
    expect(
      action.citations.some((c) => c.type === "node" && c.id === "showcase-ingest-graphiti"),
    ).toBe(true);

    expect(bodyMarkdownPrefixHash(action.bodyMarkdown)).toBe(
      goldenWithHash.bodyMarkdownPrefixHash,
    );
  });
});
