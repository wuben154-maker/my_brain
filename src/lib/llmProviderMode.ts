export type LlmProviderMode = "mock" | "openai" | "domestic-mock";

export function readLlmProviderMode(): LlmProviderMode {
  const raw = import.meta.env.VITE_LLM_PROVIDER;
  if (raw === "openai") {
    return "openai";
  }
  if (raw === "domestic-mock") {
    return "domestic-mock";
  }
  return "mock";
}
