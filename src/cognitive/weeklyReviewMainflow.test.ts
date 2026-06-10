/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildWeeklyBrainReview } from "@/cognitive/buildWeeklyBrainReview";
import {
  WEEKLY_REVIEW_FIXTURE_HISTORY,
  WEEKLY_REVIEW_FIXTURE_PROFILE,
  WEEKLY_REVIEW_FIXTURE_TRACES,
  WEEKLY_REVIEW_W22_RANGE,
} from "@/cognitive/weeklyReviewGolden";
import { CurationCompanionCard } from "@/components/companion/CurationCompanionCard";
import { WeeklyReviewCompanionCard } from "@/components/companion/WeeklyReviewCompanionCard";
import { computeReviewWindow } from "@/domain/review/reviewWindow";
import { citationKey } from "@/domain/review/weeklyBrainReview";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
} from "@/showcase/showcaseFixtures";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import { useWeeklyReviewStore } from "@/stores/weeklyReviewStore";

vi.mock("react-force-graph-2d", () => ({
  default: () => createElement("div", { "data-testid": "force-graph-2d-mock" }),
}));

function fixtureGraph() {
  const graph = createShowcaseGraphSnapshot();
  graph.nodes.push(showcaseIngestNodeFromGraph());
  return graph;
}

describe("weeklyReviewMainflow", () => {
  beforeEach(() => {
    useWeeklyReviewStore.getState().clear();
    useGraphHistoryStore.setState({
      entries: [],
      loaded: true,
      reportEntryId: null,
      historyPanelOpen: false,
      persistWarning: false,
      lastUndoError: null,
    });
  });

  afterEach(() => {
    cleanup();
    useWeeklyReviewStore.getState().clear();
    useGraphHistoryStore.getState().clear();
  });

  it("computeReviewWindow caps span at 7 days since last review", () => {
    const now = "2026-06-10T12:00:00.000Z";
    const lastReviewAt = "2026-06-01T00:00:00.000Z";
    const window = computeReviewWindow(lastReviewAt, now);
    const spanMs = Date.parse(window.end) - Date.parse(window.start);
    expect(spanMs).toBeLessThanOrEqual(7 * 86_400_000 + 1);
    expect(Date.parse(window.start)).toBeGreaterThanOrEqual(
      Date.parse(now) - 7 * 86_400_000,
    );
  });

  it("computeReviewWindow uses full span when no prior review", () => {
    const now = "2026-06-10T12:00:00.000Z";
    const window = computeReviewWindow(null, now);
    expect(window.end).toBe(now);
    expect(Date.parse(window.start)).toBe(Date.parse(now) - 7 * 86_400_000);
  });

  it("buildWeeklyBrainReview cites real merge history id M1", () => {
    const mergeId = "weekly-fixture-merge-rag-dup";
    const review = buildWeeklyBrainReview({
      graph: fixtureGraph(),
      history: WEEKLY_REVIEW_FIXTURE_HISTORY,
      traces: WEEKLY_REVIEW_FIXTURE_TRACES,
      profile: WEEKLY_REVIEW_FIXTURE_PROFILE,
      weekRange: WEEKLY_REVIEW_W22_RANGE,
    });

    expect(
      review.citations.some(
        (c) => c.type === "historyEntry" && c.id === mergeId,
      ),
    ).toBe(true);
    const graphChanges = review.sections.find((s) => s.kind === "graph_changes");
    expect(graphChanges?.citationKeys).toContain(
      citationKey("historyEntry", mergeId),
    );
  });

  it("curation companion shows entry CTA without full weekly body", () => {
    const entry = WEEKLY_REVIEW_FIXTURE_HISTORY[1]!;
    useGraphHistoryStore.setState({
      entries: WEEKLY_REVIEW_FIXTURE_HISTORY,
      reportEntryId: entry.id,
    });

    const onOpenReview = vi.fn();
    render(createElement(CurationCompanionCard, { onOpenReview }));

    expect(screen.getByTestId("curation-companion-card")).toBeTruthy();
    expect(screen.getByTestId("companion-review-entry-cta")).toBeTruthy();
    expect(screen.queryByTestId("weekly-review-companion-sections")).toBeNull();
    expect(screen.queryByTestId("weekly-review-companion-markdown")).toBeNull();

    fireEvent.click(screen.getByTestId("companion-review-entry-cta"));
    expect(onOpenReview).toHaveBeenCalledTimes(1);
  });

  it("weekly review companion shows full body only after openCompanionReview", () => {
    const review = buildWeeklyBrainReview({
      graph: fixtureGraph(),
      history: WEEKLY_REVIEW_FIXTURE_HISTORY,
      traces: WEEKLY_REVIEW_FIXTURE_TRACES,
      profile: WEEKLY_REVIEW_FIXTURE_PROFILE,
      weekRange: WEEKLY_REVIEW_W22_RANGE,
    });

    render(createElement(WeeklyReviewCompanionCard));
    expect(screen.getByText("本周还没有可回顾的图谱变化")).toBeTruthy();

    cleanup();
    useWeeklyReviewStore.getState().openCompanionReview(review);
    render(createElement(WeeklyReviewCompanionCard));

    expect(screen.getByTestId("weekly-review-companion-sections")).toBeTruthy();
    expect(screen.getByTestId("weekly-review-companion-markdown")).toBeTruthy();
    expect(
      screen.getByTestId("weekly-review-companion-section-graph_changes"),
    ).toBeTruthy();
  });
});
