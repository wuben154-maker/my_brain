export type LlmProviderMode = "mock" | "openai";

export function readLlmProviderMode(): LlmProviderMode {
  const raw = import.meta.env.VITE_LLM_PROVIDER;
  return raw === "openai" ? "openai" : "mock";
}
