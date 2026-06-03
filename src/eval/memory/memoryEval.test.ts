import { describe, expect, it } from "vitest";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { createMockMemoryProvider } from "@/providers/memory/mockMemoryProvider";
import {
  EVOLUTION_EVAL_CASE,
  RECALL_EVAL_CASES,
} from "./fixtures";
import {
  formatEvolutionEvalReport,
  isNonDecreasing,
  runEvolutionEval,
  scoreProfileTopicMatch,
} from "./evolution";
import {
  formatRecallEvalReport,
  recallHitAtK,
  runRecallEval,
} from "./recallQuality";
import {
  MEMORY_EVAL_THRESHOLDS,
  RECALL_EVAL_TOP_K,
} from "./thresholds";

describe("H3 memory eval harness", () => {
  it("recall@k is deterministic for fixed fixtures", async () => {
    const first = await runRecallEval(RECALL_EVAL_CASES, RECALL_EVAL_TOP_K);
    const second = await runRecallEval(RECALL_EVAL_CASES, RECALL_EVAL_TOP_K);
    expect(second).toEqual(first);
    const misses = first.results.filter((entry) => !entry.hit).map((entry) => entry.id);
    expect(misses, `recall misses: ${misses.join(", ")}`).toEqual([]);
    expect(first.hitRate).toBeGreaterThanOrEqual(
      MEMORY_EVAL_THRESHOLDS.recallAt5Min,
    );
  });

  it("recallHitAtK respects top-K window", () => {
    const recalled = [
      { item: { kind: "fact" as const, text: "noise only", timestamp: 1 }, score: 0.9 },
      { item: { kind: "fact" as const, text: "contains RAG detail", timestamp: 2 }, score: 0.5 },
    ];
    expect(recallHitAtK(recalled, ["RAG"], 1)).toBe(false);
    expect(recallHitAtK(recalled, ["RAG"], 2)).toBe(true);
  });

  it("degraded recall falls below threshold (guardrail proof)", async () => {
    const degraded = RECALL_EVAL_CASES.map((entry) => ({
      ...entry,
      seedItems: [],
    }));
    const report = await runRecallEval(degraded, RECALL_EVAL_TOP_K);
    expect(report.hitRate).toBeLessThan(MEMORY_EVAL_THRESHOLDS.recallAt5Min);
  });

  it("evolution curve is non-decreasing on fixture rounds", async () => {
    const report = await runEvolutionEval(EVOLUTION_EVAL_CASE);
    expect(report.scores.length).toBe(EVOLUTION_EVAL_CASE.rounds.length);
    expect(isNonDecreasing(report.scores)).toBe(
      MEMORY_EVAL_THRESHOLDS.evolutionNonDecreasing,
    );
    expect(report.scores[report.scores.length - 1]).toBeGreaterThan(0);
  });

  it("evolution uses mock LLM only (no network)", async () => {
    const llm = createMockLlmProvider();
    const report = await runEvolutionEval(EVOLUTION_EVAL_CASE, llm);
    expect(report.scores.every((score) => score >= 0 && score <= 1)).toBe(true);
  });

  it("decreasing evolution curve fails non-decreasing check", () => {
    expect(isNonDecreasing([0.2, 0.8, 1])).toBe(true);
    expect(isNonDecreasing([0.8, 0.3])).toBe(false);
  });

  it("reports are printable for CI logs", async () => {
    const recall = await runRecallEval(RECALL_EVAL_CASES, RECALL_EVAL_TOP_K);
    const evolution = await runEvolutionEval(EVOLUTION_EVAL_CASE);
    expect(formatRecallEvalReport(recall)).toContain("recall@5");
    expect(formatEvolutionEvalReport(evolution)).toContain("non-decreasing=true");
  });

  it("scoreProfileTopicMatch is stable for empty profile", () => {
    const score = scoreProfileTopicMatch(
      {
        displayName: null,
        companionName: null,
        persona: "mentor",
        interests: [],
        knownTopics: [],
        unknownTopics: [],
        explanationStyle: null,
        habits: [],
        updatedAt: new Date(0).toISOString(),
      },
      ["RAG"],
    );
    expect(score).toBe(0);
  });

  it("recall eval uses mock memory provider factory", async () => {
    let instances = 0;
    const report = await runRecallEval(RECALL_EVAL_CASES, RECALL_EVAL_TOP_K, () => {
      instances += 1;
      return createMockMemoryProvider();
    });
    expect(instances).toBe(RECALL_EVAL_CASES.length);
    expect(report.results.length).toBe(RECALL_EVAL_CASES.length);
  });
});
