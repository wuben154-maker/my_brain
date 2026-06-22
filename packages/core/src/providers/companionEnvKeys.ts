/** COMPANION live gate env var names — values must never be logged. */
import { DEFAULT_MODELSCOPE_MODEL } from "./modelscopeLlmProvider.js";

export const COMPANION_ENV_KEYS = {
  /** Volcengine console App ID → `X-Api-App-ID` */
  doubaoVoiceAppId: "DOUBAO_VOICE_APP_ID",
  /** Volcengine console Access Token → `X-Api-Access-Key` */
  doubaoVoiceAccessToken: "DOUBAO_VOICE_ACCESS_TOKEN",
  /** Volcengine console Secret Key — stored locally, not sent on realtime WS handshake */
  doubaoVoiceSecretKey: "DOUBAO_VOICE_SECRET_KEY",
  modelscopeLlmBaseUrl: "MODELSCOPE_LLM_BASE_URL",
  modelscopeLlmApiKey: "MODELSCOPE_LLM_API_KEY",
  modelscopeLlmModel: "MODELSCOPE_LLM_MODEL",
} as const;

export type CompanionEnvKey =
  (typeof COMPANION_ENV_KEYS)[keyof typeof COMPANION_ENV_KEYS];

export interface CompanionEnvSnapshot {
  doubaoVoiceAppId: string;
  doubaoVoiceAccessToken: string;
  doubaoVoiceSecretKey: string;
  modelscopeLlmBaseUrl: string;
  modelscopeLlmApiKey: string;
  modelscopeLlmModel: string;
}

export interface DoubaoVoiceEnvCredentials {
  appId: string;
  accessToken: string;
  secretKey: string;
}

export function readCompanionEnvFromRecord(
  env: Record<string, string | undefined>,
): CompanionEnvSnapshot {
  return {
    doubaoVoiceAppId: env[COMPANION_ENV_KEYS.doubaoVoiceAppId]?.trim() ?? "",
    doubaoVoiceAccessToken: env[COMPANION_ENV_KEYS.doubaoVoiceAccessToken]?.trim() ?? "",
    doubaoVoiceSecretKey: env[COMPANION_ENV_KEYS.doubaoVoiceSecretKey]?.trim() ?? "",
    modelscopeLlmBaseUrl:
      env[COMPANION_ENV_KEYS.modelscopeLlmBaseUrl]?.trim() ??
      "https://api-inference.modelscope.cn/v1",
    modelscopeLlmApiKey: env[COMPANION_ENV_KEYS.modelscopeLlmApiKey]?.trim() ?? "",
    modelscopeLlmModel:
      env[COMPANION_ENV_KEYS.modelscopeLlmModel]?.trim() ?? DEFAULT_MODELSCOPE_MODEL,
  };
}

export function readDoubaoVoiceCredentialsFromEnv(
  env: Record<string, string | undefined>,
): DoubaoVoiceEnvCredentials {
  const snapshot = readCompanionEnvFromRecord(env);
  return {
    appId: snapshot.doubaoVoiceAppId,
    accessToken: snapshot.doubaoVoiceAccessToken,
    secretKey: snapshot.doubaoVoiceSecretKey,
  };
}

export function companionEnvConfigured(snapshot: CompanionEnvSnapshot): boolean {
  return (
    Boolean(snapshot.doubaoVoiceAppId) &&
    Boolean(snapshot.doubaoVoiceAccessToken) &&
    Boolean(snapshot.modelscopeLlmApiKey)
  );
}
