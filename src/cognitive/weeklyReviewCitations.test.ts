import { describe, expect, it } from "vitest";
import { buildWeeklyBrainReview } from "@/cognitive/buildWeeklyBrainReview";
import {
  WEEKLY_REVIEW_FIXTURE_HISTORY,
  WEEKLY_REVIEW_FIXTURE_PROFILE,
  WEEKLY_REVIEW_FIXTURE_TRACES,
  WEEKLY_REVIEW_GOLDEN,
  WEEKLY_REVIEW_W22_RANGE,
} from "@/cognitive/weeklyReviewGolden";
import { citationKey } from "@/domain/review/weeklyBrainReview";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
} from "@/showcase/showcaseFixtures";

function fixtureGraph() {
  const graph = createShowcaseGraphSnapshot();
  graph.nodes.push(showcaseIngestNodeFromGraph());
  return graph;
}

function buildFixtureReview() {
  return buildWeeklyBrainReview({
    graph: fixtureGraph(),
    history: WEEKLY_REVIEW_FIXTURE_HISTORY,
    traces: WEEKLY_REVIEW_FIXTURE_TRACES,
    profile: WEEKLY_REVIEW_FIXTURE_PROFILE,
    weekRange: WEEKLY_REVIEW_W22_RANGE,
  });
}

describe("graphHistoryCitation", () => {
  it("graph_changes section cites every history entry in the window", () => {
    const review = buildFixtureReview();
    const graphChanges = review.sections.find((s) => s.kind === "graph_changes");
    expect(graphChanges).toBeDefined();
    for (const entry of WEEKLY_REVIEW_FIXTURE_HISTORY) {
      expect(graphChanges!.citationKeys).toContain(
        citationKey("historyEntry", entry.id),
      );
    }
  });
});

describe("weeklyReviewCitations", () => {
  it("every historyEntry citation exists in input history", () => {
    const review = buildFixtureReview();
    const historyIds = new Set(WEEKLY_REVIEW_FIXTURE_HISTORY.map((e) => e.id));

    for (const citation of review.citations.filter((c) => c.type === "historyEntry")) {
      expect(historyIds.has(citation.id)).toBe(true);
    }
  });

  it("every node citation exists in graph", () => {
    const graph = fixtureGraph();
    const nodeIds = new Set(graph.nodes.map((n) => n.id));
    const review = buildFixtureReview();

    for (const citation of review.citations.filter((c) => c.type === "node")) {
      expect(nodeIds.has(citation.id)).toBe(true);
    }
  });

  it("every trace citation exists in input traces", () => {
    const review = buildFixtureReview();
    const traceIds = new Set(WEEKLY_REVIEW_FIXTURE_TRACES.map((t) => t.id));

    for (const citation of review.citations.filter((c) => c.type === "trace")) {
      expect(traceIds.has(citation.id)).toBe(true);
    }
  });

  it("merge and archive sections cite their history entry ids", () => {
    const review = buildFixtureReview();
    const mergedSection = review.sections.find((s) => s.kind === "merged_archived");
    expect(mergedSection).toBeDefined();

    for (const entryId of WEEKLY_REVIEW_GOLDEN.mergeArchiveHistoryEntryIds) {
      expect(mergedSection!.citationKeys).toContain(
        citationKey("historyEntry", entryId),
      );
    }
  });

  it("includes showcase-ingest-graphiti node citation", () => {
    const review = buildFixtureReview();
    expect(
      review.citations.some(
        (c) => c.type === "node" && c.id === "showcase-ingest-graphiti",
      ),
    ).toBe(true);
  });
});
