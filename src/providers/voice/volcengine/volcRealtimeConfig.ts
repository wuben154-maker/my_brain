import { ProviderConfigError } from "@/providers/providerConfigError";
import {
  DEFAULT_VOLC_REALTIME_MODEL,
  VOLC_REALTIME_MODEL_VERSIONS,
  type VolcRealtimeModelVersion,
} from "./volcRealtimeConstants";

export interface VolcRealtimeCredentials {
  appId: string;
  accessKey: string;
  connectId?: string;
  model: VolcRealtimeModelVersion;
}

export interface VolcRealtimeEnvLike {
  volcAppId?: string;
  volcAccessKey?: string;
  volcConnectId?: string;
  volcRealtimeModel?: string;
}

export function resolveVolcRealtimeModel(
  raw: string | undefined,
): VolcRealtimeModelVersion {
  const trimmed = raw?.trim();
  if (
    trimmed &&
    (VOLC_REALTIME_MODEL_VERSIONS as readonly string[]).includes(trimmed)
  ) {
    return trimmed as VolcRealtimeModelVersion;
  }
  return DEFAULT_VOLC_REALTIME_MODEL;
}

export function resolveVolcRealtimeCredentials(
  env: VolcRealtimeEnvLike,
): VolcRealtimeCredentials {
  const appId = env.volcAppId?.trim() ?? "";
  const accessKey = env.volcAccessKey?.trim() ?? "";

  if (!appId || !accessKey) {
    throw new ProviderConfigError(
      "MISSING_API_KEY",
      "缺少火山实时语音凭证（请在 .env 设置 VITE_VOLC_APP_ID 与 VITE_VOLC_ACCESS_KEY，或将 VITE_VOICE_PROVIDER 设为 mock）",
    );
  }

  return {
    appId,
    accessKey,
    connectId: env.volcConnectId?.trim() || undefined,
    model: resolveVolcRealtimeModel(env.volcRealtimeModel),
  };
}

/**
 * Browser WebSocket cannot attach Volc handshake headers.
 * Live connect requires Tauri/native transport or a dev proxy that injects headers.
 */
export function volcRealtimeRequiresNativeTransport(): boolean {
  return typeof window !== "undefined";
}

export function volcNativeTransportRequiredMessage(): string {
  return (
    "豆包实时语音需要 WebSocket 握手 Header（X-Api-App-ID / X-Api-Access-Key）。" +
    "浏览器 WebSocket 无法附带这些 Header；请在 Tauri 桌面端接入原生传输，或使用 VITE_VOICE_PROVIDER=mock。"
  );
}
