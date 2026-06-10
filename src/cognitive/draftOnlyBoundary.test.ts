/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildWeeklyBrainReview } from "@/cognitive/buildWeeklyBrainReview";
import { wrapWeeklyReviewAsAction } from "@/actions/wrapWeeklyReviewAsAction";
import {
  WEEKLY_REVIEW_FIXTURE_HISTORY,
  WEEKLY_REVIEW_FIXTURE_PROFILE,
  WEEKLY_REVIEW_FIXTURE_TRACES,
  WEEKLY_REVIEW_W22_RANGE,
} from "@/cognitive/weeklyReviewGolden";
import { WeeklyReviewCompanionCard } from "@/components/companion/WeeklyReviewCompanionCard";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
} from "@/showcase/showcaseFixtures";
import { useWeeklyReviewStore } from "@/stores/weeklyReviewStore";

function fixtureReview() {
  const graph = createShowcaseGraphSnapshot();
  graph.nodes.push(showcaseIngestNodeFromGraph());
  return buildWeeklyBrainReview({
    graph,
    history: WEEKLY_REVIEW_FIXTURE_HISTORY,
    traces: WEEKLY_REVIEW_FIXTURE_TRACES,
    profile: WEEKLY_REVIEW_FIXTURE_PROFILE,
    weekRange: WEEKLY_REVIEW_W22_RANGE,
  });
}

describe("draftOnlyBoundary", () => {
  beforeEach(() => {
    useWeeklyReviewStore.getState().clear();
  });

  afterEach(() => {
    cleanup();
    useWeeklyReviewStore.getState().clear();
  });

  it("wrapWeeklyReviewAsAction stays draft suggest-only", () => {
    const review = fixtureReview();
    const action = wrapWeeklyReviewAsAction(review);
    expect(action.status).toBe("draft");
    expect(action.permissionLevel).toBe("suggest");
  });

  it("weekly review companion shows draft label without execute controls", () => {
    const review = fixtureReview();
    useWeeklyReviewStore.getState().openCompanionReview(review);

    render(createElement(WeeklyReviewCompanionCard));

    expect(screen.getByTestId("weekly-review-draft-only-label")).toBeTruthy();
    expect(screen.getByTestId("weekly-review-draft-only-label").textContent).toContain(
      "draft-only",
    );
    expect(screen.queryByRole("button", { name: /执行|发布|创建 issue/i })).toBeNull();
    expect(screen.queryByTestId("weekly-review-action-execute")).toBeNull();
  });
});
