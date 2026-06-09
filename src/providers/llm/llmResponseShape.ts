export interface LlmTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/** Shared adapter response shape for mock parity harnesses. */
export interface LlmTextResponse {
  text: string;
  usage?: LlmTokenUsage;
}

export const MOCK_LLM_RESPONSE_SHAPE_KEYS = ["text", "usage"] as const;

export function assertLlmTextResponseShape(
  value: unknown,
): asserts value is LlmTextResponse {
  if (!value || typeof value !== "object") {
    throw new Error("LLM response must be an object");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.text !== "string") {
    throw new Error("LLM response.text must be a string");
  }
  if (
    record.usage !== undefined &&
    (typeof record.usage !== "object" || record.usage === null)
  ) {
    throw new Error("LLM response.usage must be an object when present");
  }
}

export function wrapTextAsLlmResponse(text: string): LlmTextResponse {
  return { text };
}
