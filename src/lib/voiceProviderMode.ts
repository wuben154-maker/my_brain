export type VoiceProviderMode = "mock" | "openai-realtime";

export function readVoiceProviderMode(): VoiceProviderMode {
  const raw = import.meta.env.VITE_VOICE_PROVIDER;
  return raw === "openai-realtime" ? "openai-realtime" : "mock";
}
