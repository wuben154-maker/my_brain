export type VoiceProviderMode = "mock" | "openai-realtime" | "volc-realtime";

export function readVoiceProviderMode(): VoiceProviderMode {
  const raw = import.meta.env.VITE_VOICE_PROVIDER;
  if (raw === "openai-realtime") {
    return "openai-realtime";
  }
  if (raw === "volc-realtime") {
    return "volc-realtime";
  }
  return "mock";
}
