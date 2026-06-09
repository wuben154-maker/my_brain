/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WeeklyReviewOverlay } from "@/components/review/WeeklyReviewOverlay";
import { buildWeeklyBrainReview } from "@/cognitive/buildWeeklyBrainReview";
import {
  WEEKLY_REVIEW_FIXTURE_HISTORY,
  WEEKLY_REVIEW_FIXTURE_PROFILE,
  WEEKLY_REVIEW_FIXTURE_TRACES,
  WEEKLY_REVIEW_W22_RANGE,
} from "@/cognitive/weeklyReviewGolden";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
} from "@/showcase/showcaseFixtures";
import { useGraphStore } from "@/stores/graphStore";
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

describe("weeklyReviewOverlay", () => {
  const closeReview = vi.fn();

  beforeEach(() => {
    const review = fixtureReview();
    useWeeklyReviewStore.setState({
      open: true,
      review,
      openReview: vi.fn(),
      closeReview,
      clear: useWeeklyReviewStore.getState().clear,
    });
    useGraphStore.setState(createShowcaseGraphSnapshot());
    closeReview.mockClear();
  });

  afterEach(() => {
    cleanup();
    useWeeklyReviewStore.getState().clear();
  });

  it("renders sections and markdown when open", () => {
    render(createElement(WeeklyReviewOverlay));
    expect(screen.getByTestId("weekly-review-overlay")).toBeTruthy();
    expect(screen.getByTestId("weekly-review-week-id").textContent).toBe("2026-W22");
    expect(screen.getByTestId("weekly-review-markdown").textContent).toContain(
      "每周脑图回顾",
    );
    expect(screen.getByTestId("weekly-review-section-graph_changes")).toBeTruthy();
    expect(screen.getByTestId("weekly-review-section-new_concepts")).toBeTruthy();
    expect(screen.getByTestId("weekly-review-section-next_steps")).toBeTruthy();
  });

  it("renders citation chips for graphiti node", () => {
    render(createElement(WeeklyReviewOverlay));
    expect(
      screen.getAllByTestId("weekly-review-citation-node-showcase-ingest-graphiti")
        .length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("closes overlay without mutating graph node count", () => {
    const beforeCount = useGraphStore.getState().nodes.length;
    render(createElement(WeeklyReviewOverlay));
    fireEvent.click(screen.getByTestId("weekly-review-close"));
    expect(closeReview).toHaveBeenCalled();
    expect(useGraphStore.getState().nodes.length).toBe(beforeCount);
  });

  it("does not render when closed", () => {
    useWeeklyReviewStore.setState({ open: false, review: null });
    render(createElement(WeeklyReviewOverlay));
    expect(screen.queryByTestId("weekly-review-overlay")).toBeNull();
  });
});
