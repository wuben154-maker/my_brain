import { createMockMemoryProvider } from "@/providers/memory/mockMemoryProvider";
import type { MemoryProvider, RecalledMemory } from "@/providers/memory/types";
import type { RecallEvalCase } from "./fixtures";

export interface RecallCaseResult {
  id: string;
  hit: boolean;
  recalledCount: number;
}

export interface RecallEvalReport {
  k: number;
  hitRate: number;
  results: RecallCaseResult[];
}

/** True when any expected substring appears in a top-K recalled item. */
export function recallHitAtK(
  recalled: RecalledMemory[],
  expectedSubstrings: string[],
  k: number,
): boolean {
  if (expectedSubstrings.length === 0) {
    return false;
  }
  const top = recalled.slice(0, k);
  const texts = top.map((entry) => entry.item.text.toLowerCase());
  return expectedSubstrings.some((expected) => {
    const needle = expected.toLowerCase();
    return texts.some((text) => text.includes(needle));
  });
}

export async function evaluateRecallCase(
  memory: MemoryProvider,
  testCase: RecallEvalCase,
  k: number,
): Promise<RecallCaseResult> {
  await memory.remember(testCase.seedItems);
  const recalled = await memory.recall({ query: testCase.query, topK: k });
  return {
    id: testCase.id,
    hit: recallHitAtK(recalled, testCase.expectedInRecall, k),
    recalledCount: recalled.length,
  };
}

export async function runRecallEval(
  cases: RecallEvalCase[],
  k: number,
  memoryFactory: () => MemoryProvider = createMockMemoryProvider,
): Promise<RecallEvalReport> {
  const results: RecallCaseResult[] = [];
  for (const testCase of cases) {
    const memory = memoryFactory();
    results.push(await evaluateRecallCase(memory, testCase, k));
  }
  const hits = results.filter((entry) => entry.hit).length;
  return {
    k,
    hitRate: cases.length === 0 ? 0 : hits / cases.length,
    results,
  };
}

export function formatRecallEvalReport(report: RecallEvalReport): string {
  const lines = report.results.map(
    (entry) =>
      `  ${entry.hit ? "✓" : "✗"} ${entry.id} (recalled=${entry.recalledCount})`,
  );
  return [
    `recall@${report.k}: ${(report.hitRate * 100).toFixed(0)}%`,
    ...lines,
  ].join("\n");
}
