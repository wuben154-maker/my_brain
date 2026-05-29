export interface AppEnv {
  openAiApiKey: string;
  openAiLlmModel: string;
  openAiRealtimeModel: string;
}

export function readAppEnv(): AppEnv {
  return {
    openAiApiKey: import.meta.env.VITE_OPENAI_API_KEY ?? "",
    openAiLlmModel: import.meta.env.VITE_OPENAI_LLM_MODEL ?? "gpt-4o-mini",
    openAiRealtimeModel:
      import.meta.env.VITE_OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview",
  };
}
