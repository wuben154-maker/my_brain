import { describe, expect, it } from "vitest";
import {
  buildWeeklyBrainReview,
  weeklyReviewMatchesGolden,
  weeklyReviewStructuredSnapshot,
} from "@/cognitive/buildWeeklyBrainReview";
import {
  WEEKLY_REVIEW_FIXTURE_HISTORY,
  WEEKLY_REVIEW_FIXTURE_PROFILE,
  WEEKLY_REVIEW_FIXTURE_TRACES,
  WEEKLY_REVIEW_FORBIDDEN_EMPTY_HISTORY_NAMES,
  WEEKLY_REVIEW_GOLDEN,
  WEEKLY_REVIEW_W22_RANGE,
} from "@/cognitive/weeklyReviewGolden";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
} from "@/showcase/showcaseFixtures";

function fixtureGraph() {
  const graph = createShowcaseGraphSnapshot();
  graph.nodes.push(showcaseIngestNodeFromGraph());
  return graph;
}

describe("buildWeeklyBrainReview", () => {
  it("matches WEEKLY_REVIEW_GOLDEN on fixture history for 2026-W22", () => {
    const review = buildWeeklyBrainReview({
      graph: fixtureGraph(),
      history: WEEKLY_REVIEW_FIXTURE_HISTORY,
      traces: WEEKLY_REVIEW_FIXTURE_TRACES,
      profile: WEEKLY_REVIEW_FIXTURE_PROFILE,
      weekRange: WEEKLY_REVIEW_W22_RANGE,
      generatedAt: WEEKLY_REVIEW_W22_RANGE.end,
    });

    expect(review.weekId).toBe("2026-W22");
    expect(weeklyReviewMatchesGolden(review, WEEKLY_REVIEW_GOLDEN)).toBe(true);

    const graphChanges = review.sections.find((s) => s.kind === "graph_changes");
    expect(graphChanges?.body).toContain(
      WEEKLY_REVIEW_GOLDEN.graphChangesBodyContains,
    );
  });

  it("empty history week states no structural changes and omits fabricated names", () => {
    const review = buildWeeklyBrainReview({
      graph: fixtureGraph(),
      history: [],
      traces: [],
      profile: WEEKLY_REVIEW_FIXTURE_PROFILE,
      weekRange: WEEKLY_REVIEW_W22_RANGE,
    });

    const graphChanges = review.sections.find((s) => s.kind === "graph_changes");
    expect(graphChanges?.body).toContain("回顾窗口内无结构变更");

    const merged = review.sections.find((s) => s.kind === "merged_archived");
    expect(merged).toBeUndefined();

    const blob = JSON.stringify(review);
    for (const forbidden of WEEKLY_REVIEW_FORBIDDEN_EMPTY_HISTORY_NAMES) {
      expect(blob).not.toContain(forbidden);
    }
  });

  it("does not mutate graph node count", () => {
    const graph = fixtureGraph();
    const beforeCount = graph.nodes.length;
    buildWeeklyBrainReview({
      graph,
      history: WEEKLY_REVIEW_FIXTURE_HISTORY,
      traces: WEEKLY_REVIEW_FIXTURE_TRACES,
      profile: WEEKLY_REVIEW_FIXTURE_PROFILE,
      weekRange: WEEKLY_REVIEW_W22_RANGE,
    });
    expect(graph.nodes.length).toBe(beforeCount);
  });

  it("structured snapshot includes required section kinds from golden", () => {
    const review = buildWeeklyBrainReview({
      graph: fixtureGraph(),
      history: WEEKLY_REVIEW_FIXTURE_HISTORY,
      traces: WEEKLY_REVIEW_FIXTURE_TRACES,
      profile: WEEKLY_REVIEW_FIXTURE_PROFILE,
      weekRange: WEEKLY_REVIEW_W22_RANGE,
    });
    const snapshot = weeklyReviewStructuredSnapshot(review);
    for (const kind of ["graph_changes", "new_concepts", "next_steps"] as const) {
      expect(snapshot.sectionKinds).toContain(kind);
    }
  });
});
