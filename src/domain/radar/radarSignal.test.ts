import { describe, expect, it } from "vitest";
import {
  assertRadarSignal,
  getRadarSignalValidationErrors,
} from "@/domain/radar/radarSignal";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";

describe("RadarSignal", () => {
  it("accepts explainable signals with graph-backed linked nodes", () => {
    expect(() =>
      assertRadarSignal(
        {
          worldItemId: "radar-wi-rel-1",
          reasonCode: "project_adjacent",
          explanation: "涉及实时语音与打断能力，与你的语音伴侣项目方向一致。",
          linkedNodeIds: ["demo-agent"],
          score: 0.96,
        },
        SHOWCASE_GRAPH_SNAPSHOT,
      ),
    ).not.toThrow();
  });

  it("rejects empty, overlong, out-of-range, and fake graph-linked signals", () => {
    const errors = getRadarSignalValidationErrors(
      {
        worldItemId: "",
        reasonCode: "graph_concept_overlap",
        explanation: "x".repeat(121),
        linkedNodeIds: ["missing-node"],
        score: 2,
      },
      SHOWCASE_GRAPH_SNAPSHOT,
    );

    expect(errors).toEqual([
      "worldItemId must be non-empty",
      "explanation must be <= 120 chars",
      "score must be 0..1",
      "linkedNodeId not found in graph: missing-node",
    ]);
  });
});
