export interface AppEnv {
  openAiApiKey: string;
  openAiLlmModel: string;
  openAiRealtimeModel: string;
  everMemOsBaseUrl: string;
  everMemOsApiKey: string;
  everMemOsUserId: string;
  domesticLlmApiKey: string;
  domesticLlmBaseUrl: string;
  modelscopeApiKey: string;
  modelscopeBaseUrl: string;
  modelscopeLlmModel: string;
  volcAppId: string;
  volcAccessKey: string;
  volcConnectId: string;
  volcRealtimeModel: string;
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
    domesticLlmApiKey: import.meta.env.VITE_DOMESTIC_LLM_API_KEY ?? "",
    domesticLlmBaseUrl: import.meta.env.VITE_DOMESTIC_LLM_BASE_URL ?? "",
    modelscopeApiKey: import.meta.env.VITE_MODELSCOPE_API_KEY ?? "",
    modelscopeBaseUrl:
      import.meta.env.VITE_MODELSCOPE_BASE_URL ??
      "https://api-inference.modelscope.cn/v1",
    modelscopeLlmModel:
      import.meta.env.VITE_MODELSCOPE_LLM_MODEL ?? "Qwen/Qwen2.5-7B-Instruct",
    volcAppId: import.meta.env.VITE_VOLC_APP_ID ?? "",
    volcAccessKey: import.meta.env.VITE_VOLC_ACCESS_KEY ?? "",
    volcConnectId: import.meta.env.VITE_VOLC_CONNECT_ID ?? "",
    volcRealtimeModel: import.meta.env.VITE_VOLC_REALTIME_MODEL ?? "2.2.0.0",
  };
}
