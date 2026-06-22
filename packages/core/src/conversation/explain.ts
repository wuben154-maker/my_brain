import type { LlmProvider } from "../providers/types.js";

export type ExplainMoreSource = "llm" | "mock_fallback";

export interface ExplainMoreInput {
  topic: string;
  context?: string;
  llm: LlmProvider;
}

export interface ExplainMoreResult {
  text: string;
  source: ExplainMoreSource;
  degraded: boolean;
}

export function buildMockExplainFallback(topic: string, context?: string): string {
  const label = topic.trim() || "该主题";
  const ctx = context?.trim()
    ? `（参考：${context.trim().slice(0, 120)}）`
    : "";
  return `（演示）mock 讲细点 · ${label}${ctx}：这是占位解释，不会自动入库。`;
}

/** LLM-backed explain with deterministic mock fallback — never blocks interaction. */
export async function resolveExplainMore(
  input: ExplainMoreInput,
): Promise<ExplainMoreResult> {
  try {
    const text = (await input.llm.explain(input.topic, input.context)).trim();
    if (!text) {
      return {
        text: buildMockExplainFallback(input.topic, input.context),
        source: "mock_fallback",
        degraded: true,
      };
    }
    return { text, source: "llm", degraded: false };
  } catch {
    return {
      text: buildMockExplainFallback(input.topic, input.context),
      source: "mock_fallback",
      degraded: true,
    };
  }
}
