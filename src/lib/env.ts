export interface AppEnv {
  openAiApiKey: string;
  openAiLlmModel: string;
  openAiRealtimeModel: string;
  everMemOsBaseUrl: string;
  everMemOsApiKey: string;
  everMemOsUserId: string;
}

export function readAppEnv(): AppEnv {
  return {
    openAiApiKey: import.meta.env.VITE_OPENAI_API_KEY ?? "",
    openAiLlmModel: import.meta.env.VITE_OPENAI_LLM_MODEL ?? "gpt-4o-mini",
    openAiRealtimeModel:
      import.meta.env.VITE_OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview",
    everMemOsBaseUrl:
      import.meta.env.VITE_EVERMEMOS_BASE_URL ?? "http://localhost:1995",
    everMemOsApiKey: import.meta.env.VITE_EVERMEMOS_API_KEY ?? "",
    everMemOsUserId:
      import.meta.env.VITE_EVERMEMOS_USER_ID ?? "my_brain_local",
  };
}
