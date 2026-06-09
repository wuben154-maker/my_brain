export type ProviderConfigErrorCode = "MISSING_API_KEY";

/** Structured provider bootstrap failure — caught by aggregation for mock fallback. */
export class ProviderConfigError extends Error {
  readonly code: ProviderConfigErrorCode;

  constructor(code: ProviderConfigErrorCode, message: string) {
    super(message);
    this.name = "ProviderConfigError";
    this.code = code;
  }
}

export function isProviderConfigError(
  error: unknown,
): error is ProviderConfigError {
  return error instanceof ProviderConfigError;
}

export function isMissingApiKeyError(error: unknown): boolean {
  return isProviderConfigError(error) && error.code === "MISSING_API_KEY";
}
