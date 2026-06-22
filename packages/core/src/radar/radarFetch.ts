export type RadarFetch = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}>;

export type RadarFetchErrorCode =
  | "HTTP_ERROR"
  | "NETWORK_ERROR"
  | "EMPTY_RESPONSE"
  | "PARSE_ERROR";

export class RadarFetchError extends Error {
  readonly code: RadarFetchErrorCode;
  readonly status?: number;

  constructor(code: RadarFetchErrorCode, message: string, status?: number) {
    super(message);
    this.name = "RadarFetchError";
    this.code = code;
    this.status = status;
  }
}

export function mapRadarHttpStatus(status: number): string {
  if (status === 401) {
    return "unauthorized";
  }
  if (status === 429) {
    return "rate_limited";
  }
  if (status >= 500) {
    return "server_error";
  }
  return "http_error";
}

export function degradedReasonFromFetchError(error: unknown): string {
  if (error instanceof RadarFetchError) {
    if (error.status !== undefined) {
      return `radar_fetch_${mapRadarHttpStatus(error.status)}:${error.message}`;
    }
    return `radar_fetch_${error.code.toLowerCase()}:${error.message}`;
  }
  if (error instanceof Error) {
    return `radar_fetch_failed:${error.message}`;
  }
  return "radar_fetch_failed:unknown";
}
