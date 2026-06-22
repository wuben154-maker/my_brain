import type { LlmProviderErrorCode } from "./llmErrors.js";
import type { LlmStructuredJsonRequest, LlmStructuredJsonResult } from "./types.js";

function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return trimmed;
}

export function parseStructuredJsonResponse<T>(
  raw: string,
  request: LlmStructuredJsonRequest<T>,
): LlmStructuredJsonResult<T> {
  const candidate = extractJsonCandidate(raw);
  if (!candidate) {
    return {
      ok: false,
      errorCode: "EMPTY_RESPONSE",
      message: "Structured LLM response was empty",
      raw,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return {
      ok: false,
      errorCode: "PARSE_ERROR",
      message: "Structured LLM response was not valid JSON",
      raw,
    };
  }

  if (!request.validate(parsed)) {
    return {
      ok: false,
      errorCode: "PARSE_ERROR",
      message: "Structured LLM response failed schema validation",
      raw,
    };
  }

  return { ok: true, value: parsed, raw };
}

export function mockStructuredJsonValue(prompt: string): Record<string, unknown> {
  return {
    mock: true,
    prompt: prompt.slice(0, 48),
  };
}

export function isMockStructuredJsonValue(
  value: unknown,
): value is { mock: true; prompt: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.mock === true && typeof record.prompt === "string";
}

export type { LlmProviderErrorCode };
