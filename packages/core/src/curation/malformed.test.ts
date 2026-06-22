import { describe, expect, it } from "vitest";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "../graph/memoryRepository.js";
import { createMockLlmProvider } from "../providers/mockFactories.js";
import { parseStructuredJsonResponse } from "../providers/structuredJsonParse.js";
import { validateLlmCurationSuggestion } from "./schema.js";
import { planFromFixtureActions } from "./planner.js";
import {
  runCurationPlan,
  runPostIngestCurationWithLlm,
} from "./run.js";

describe("curation malformed LLM output", () => {
  it("rejects invalid schema before graph mutation", () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot({
      nodes: [
        {
          id: "node-a",
          concept: "A",
          intro: "a",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "node-b",
          concept: "B",
          intro: "b",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [],
    });
    const history = new InMemoryHistoryRepository();
    const before = graph.getSnapshot();

    const result = runCurationPlan(
      { graph, history },
      {
        ingestedNodeId: "node-a",
        plan: planFromFixtureActions([
          {
            kind: "merge",
            sourceNodeId: "node-a",
            targetNodeId: "missing-node",
            mergedIntro: "nope",
            summary: "bad merge",
          },
        ]),
      },
    );

    expect(result.status).toBe("degraded");
    expect(result.degradedReason).toBeTruthy();
    expect(graph.getSnapshot()).toEqual(before);
    expect(history.listChanges()).toHaveLength(0);
  });

  it("mock LLM structured output fails validation and does not mutate graph", async () => {
    const graph = new InMemoryGraphRepository();
    graph.replaceSnapshot({
      nodes: [
        {
          id: "node-a",
          concept: "A",
          intro: "a",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "node-b",
          concept: "B",
          intro: "b",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [],
    });
    const history = new InMemoryHistoryRepository();
    const before = graph.getSnapshot();
    const llm = createMockLlmProvider();

    const result = await runPostIngestCurationWithLlm(
      { graph, history },
      { ingestedNodeId: "node-a", llm },
    );

    expect(result.status).toBe("degraded");
    expect(result.degradedReason).toBeTruthy();
    expect(graph.getSnapshot()).toEqual(before);
    expect(history.listChanges()).toHaveLength(0);
  });

  it("parseStructuredJsonResponse rejects non-curation JSON", () => {
    const parsed = parseStructuredJsonResponse(
      JSON.stringify({ mock: true, prompt: "curation" }),
      {
        prompt: "curation",
        validate: validateLlmCurationSuggestion,
      },
    );

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.message).toContain("schema validation");
    }
  });
});
