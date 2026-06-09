import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  INGEST_STAR_LIGHT_DURATION_MS,
  pulseIngestStarLight,
  resetIngestStarLightForTests,
} from "@/lib/ingestStarLight";
import { useGraphStore } from "@/stores/graphStore";

describe("ingestStarLight", () => {
  beforeEach(() => {
    resetIngestStarLightForTests();
    useGraphStore.setState({
      focusNodeId: null,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    resetIngestStarLightForTests();
  });

  it("sets focusNodeId and highlight for the ingest star-light window", () => {
    vi.useFakeTimers();
    pulseIngestStarLight("showcase-ingest-graphiti");

    expect(useGraphStore.getState().focusNodeId).toBe("showcase-ingest-graphiti");
    expect(useGraphStore.getState().highlightedNodeIds).toEqual([
      "showcase-ingest-graphiti",
    ]);

    vi.advanceTimersByTime(INGEST_STAR_LIGHT_DURATION_MS - 1);
    expect(useGraphStore.getState().focusNodeId).toBe("showcase-ingest-graphiti");

    vi.advanceTimersByTime(1);
    expect(useGraphStore.getState().focusNodeId).toBeNull();
    expect(useGraphStore.getState().highlightedNodeIds).toEqual([]);
  });
});
