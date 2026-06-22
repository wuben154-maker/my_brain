import type { ProviderMode } from "../env/types.js";

export type VoiceConnectionState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

export interface VoiceProvider {
  readonly id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  interrupt(): Promise<void>;
  getState(): VoiceConnectionState;
}

export type LlmConnectionStatus = "connected" | "degraded" | "error";

export type LlmProviderErrorCode =
  | "MISSING_API_KEY"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "EMPTY_RESPONSE";

export interface LlmConnectionTestResult {
  status: LlmConnectionStatus;
  errorCode?: LlmProviderErrorCode;
  message?: string;
}

export interface LlmStructuredJsonRequest<T = unknown> {
  prompt: string;
  schemaHint?: string;
  validate: (value: unknown) => value is T;
}

export type LlmStructuredJsonResult<T> =
  | { ok: true; value: T; raw: string }
  | {
      ok: false;
      errorCode: LlmProviderErrorCode;
      message: string;
      raw?: string;
    };

export interface LlmProvider {
  readonly id: string;
  summarize(text: string): Promise<string>;
  explain(topic: string, context?: string): Promise<string>;
  generateStructuredJson<T>(
    request: LlmStructuredJsonRequest<T>,
  ): Promise<LlmStructuredJsonResult<T>>;
  testConnection(): Promise<LlmConnectionTestResult>;
}

export interface NewsSource {
  readonly id: string;
  fetchHeadlines(): Promise<Array<{ id: string; title: string }>>;
}

export interface ProviderBundle {
  voice: VoiceProvider;
  llm: LlmProvider;
  news: NewsSource;
  modes: {
    voice: ProviderMode;
    llm: ProviderMode;
    newsRadar: ProviderMode;
  };
}
