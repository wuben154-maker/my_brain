export type LlmProviderMode = "mock" | "openai" | "domestic-mock" | "modelscope";

export function readLlmProviderMode(): LlmProviderMode {
  const raw = import.meta.env.VITE_LLM_PROVIDER;
  if (raw === "openai") {
    return "openai";
  }
  if (raw === "domestic-mock") {
    return "domestic-mock";
  }
  if (raw === "modelscope") {
    return "modelscope";
  }
  return "mock";
}
