import type { DegradedModeState } from "../profile/correctionHistory.js";
import type { ProviderConfigSnapshot } from "./mobileStorage.js";

export type ProviderPanelStatus = ProviderConfigSnapshot;

export function buildProviderStatusFromDegraded(
  degraded: DegradedModeState,
  storageStatus: ProviderPanelStatus["storage"],
): ProviderPanelStatus {
  const llm: ProviderPanelStatus["llm"] =
    degraded.providerMode === "live"
      ? "live"
      : degraded.providerMode === "degraded"
        ? "degraded"
        : "mock";
  const radar: ProviderPanelStatus["radar"] = degraded.active.includes("fixture_radar")
    ? "fixture"
    : degraded.providerMode === "live"
      ? "live"
      : "degraded";
  const voice: ProviderPanelStatus["voice"] = degraded.active.includes("voice_disconnected")
    ? "disconnected"
    : "mock";
  return {
    llm,
    radar,
    voice,
    storage: storageStatus,
    lastErrorCode: degraded.active.includes("mock_llm")
      ? "ProviderConfigError"
      : undefined,
  };
}

export const PROVIDER_STATUS_TEST_IDS = {
  llm: "provider-status-llm",
  radar: "provider-status-radar",
  voice: "provider-status-voice",
  storage: "provider-status-storage",
} as const;
