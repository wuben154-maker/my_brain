import { describe, expect, it } from "vitest";

import type { GraphChangeRecord } from "../graph/types.js";
import { M5_MODE_FIXTURES, runM5Fixture } from "./m5Fixtures.js";

function change(id: string, at: string): GraphChangeRecord {
  const empty = { nodes: [], edges: [] };
  return {
    id,
    kind: "node_created",
    summary: `change ${id}`,
    before: empty,
    after: empty,
    createdAt: at,
    undone: false,
  };
}

describe("modeAdaptive", () => {
  for (const fixture of M5_MODE_FIXTURES.filter((f) => !f.secondaryModes?.length)) {
    it(`${fixture.id} produces mode-specific output kinds`, () => {
      const experiences = runM5Fixture(fixture, {
        graphChanges: [change("m", "2026-06-15T13:00:00Z")],
        nodes: [
          {
            id: "n-mode",
            concept: "样本概念",
            intro: "简介",
            sourceLinks: [],
            archived: false,
            createdAt: "2026-06-15T13:00:00Z",
          },
        ],
        radarSignals:
          fixture.primaryMode === "tech_tracker"
            ? [
                {
                  id: "radar-1",
                  title: "趋势信号",
                  freshness: 0.9,
                  updatedAt: "2026-06-15T13:00:00Z",
                },
              ]
            : [],
        learningTraces:
          fixture.primaryMode === "learner"
            ? [
                {
                  id: "lt-1",
                  topic: "Rust 所有权",
                  note: "巩固",
                  createdAt: "2026-06-15T13:00:00Z",
                },
              ]
            : [],
      });

      expect(experiences.weather.visible).toBe(true);
      expect(experiences.replay.visible).toBe(true);
      expect(experiences.reverseQuestion.visible).toBe(true);
      expect(experiences.weather.cards[0]?.outputKind).toBe(
        fixture.expected.memoryWeather.outputKind,
      );
      expect(experiences.replay.outputKind).toBe(
        fixture.expected.memoryReplay.outputKind,
      );
      expect(experiences.reverseQuestion.outputKind).toBe(
        fixture.expected.reverseQuestion.outputKind,
      );
    });
  }
});
