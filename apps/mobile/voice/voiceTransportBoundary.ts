import type { AppEnv } from "@my-brain/core";

export type VoiceTransportKind = "mock" | "byok_live" | "staging_stub";

/** Machine boundary for voice transport — mock complete; native device evidence deferred. */
export const M3_VOICE_TRANSPORT_BOUNDARY = {
  machineComplete: ["mock", "byok_live"] as const,
  deferredToDeviceEvidence: ["staging_stub"] as const,
} as const;

export function resolveVoiceTransportKind(
  hasVoiceKey: boolean,
  providerId: string,
  transportConnected: boolean,
): VoiceTransportKind {
  if (!hasVoiceKey || providerId === "mock") {
    return "mock";
  }
  if (transportConnected) {
    return "byok_live";
  }
  return "staging_stub";
}

export function resolveVoiceTransportKindFromEnv(env: AppEnv): VoiceTransportKind {
  if (env.providerModes.voice !== "live") {
    return "mock";
  }
  return env.tokenExchangeUrl ? "staging_stub" : "byok_live";
}

export function isM3MachineTransportComplete(kind: VoiceTransportKind): boolean {
  return kind === "mock" || kind === "byok_live";
}

/** Staging VoiceProvider stub — documents native WS contract without claiming live Realtime. */
export function createStagingVoiceProviderStub(deviceId: string): {
  id: string;
  transportKind: VoiceTransportKind;
  note: string;
} {
  return {
    id: "volc-realtime-staging-stub",
    transportKind: "staging_stub",
    note: `BYOK preferred: native WS + voice_api_key for device ${deviceId.slice(0, 8)} — NEEDS_DEVICE_EVIDENCE`,
  };
}
