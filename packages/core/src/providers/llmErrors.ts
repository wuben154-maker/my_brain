export type LlmProviderErrorCode =
  | "MISSING_API_KEY"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "EMPTY_RESPONSE";

export class LlmProviderError extends Error {
  readonly code: LlmProviderErrorCode;
  readonly httpStatus?: number;

  constructor(code: LlmProviderErrorCode, message: string, httpStatus?: number) {
    super(message);
    this.name = "LlmProviderError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function mapHttpStatusToErrorCode(status: number): LlmProviderErrorCode {
  if (status === 401) {
    return "UNAUTHORIZED";
  }
  if (status === 429) {
    return "RATE_LIMITED";
  }
  if (status >= 500) {
    return "SERVER_ERROR";
  }
  return "SERVER_ERROR";
}

export function connectionStatusFromErrorCode(
  code: LlmProviderErrorCode,
): "connected" | "degraded" | "error" {
  if (code === "RATE_LIMITED" || code === "SERVER_ERROR") {
    return "degraded";
  }
  return "error";
}
