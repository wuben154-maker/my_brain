import type { AppEnv } from "@/lib/env";
import { readVoiceProviderMode } from "@/lib/voiceProviderMode";
import type { VoiceProviderConfig } from "@/providers/voice/types";

const DEFAULT_INSTRUCTIONS =
  "你是 my_brain，用户的 AI 大脑伴侣。用自然的中文口语交流，技术术语保留英文原词。回答简洁，像朋友聊天。用户可以随时打断你，被打断后立即停止并倾听。";

export function resolveVoiceConnectConfig(
  env: AppEnv,
  overrides?: Partial<VoiceProviderConfig>,
): VoiceProviderConfig {
  const mode = readVoiceProviderMode();
  const base: VoiceProviderConfig = {
    apiKey: "",
    instructions: DEFAULT_INSTRUCTIONS,
    ...overrides,
  };

  if (mode === "openai-realtime") {
    return {
      ...base,
      apiKey: env.openAiApiKey,
      model: env.openAiRealtimeModel,
    };
  }

  if (mode === "volc-realtime") {
    return {
      ...base,
      apiKey: env.volcAccessKey,
      model: env.volcRealtimeModel,
      volcAppId: env.volcAppId,
      volcAccessKey: env.volcAccessKey,
      volcConnectId: env.volcConnectId,
    };
  }

  return base;
}

export function voiceCredentialsConfigured(env: AppEnv): boolean {
  const mode = readVoiceProviderMode();
  if (mode === "openai-realtime") {
    return Boolean(env.openAiApiKey.trim());
  }
  if (mode === "volc-realtime") {
    return Boolean(env.volcAppId.trim() && env.volcAccessKey.trim());
  }
  return true;
}

export function missingVoiceCredentialMessage(): string {
  const mode = readVoiceProviderMode();
  if (mode === "volc-realtime") {
    return "缺少火山实时语音凭证（VITE_VOLC_APP_ID / VITE_VOLC_ACCESS_KEY）";
  }
  return "缺少 OpenAI API Key";
}
