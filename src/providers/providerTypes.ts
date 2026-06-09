export interface ProviderEnv {
  openAiApiKey: string;
  openAiLlmModel?: string;
  openAiRealtimeModel?: string;
  everMemOsBaseUrl?: string;
  everMemOsApiKey?: string;
  everMemOsUserId?: string;
  domesticLlmApiKey?: string;
  domesticLlmBaseUrl?: string;
}

export interface CreateAppProvidersOptions {
  /** Force all providers to local mocks; used by showcase harnesses. */
  forceMock?: boolean;
  /** Optional warning sink for provider fallback (tests + boot logs). */
  warn?: (message: string) => void;
}
