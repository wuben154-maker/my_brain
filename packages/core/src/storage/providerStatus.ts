import type { DegradedModeState } from "../profile/correctionHistory.js";
import type { ProviderConfigSnapshot } from "./mobileStorage.js";

export type ProviderPanelStatus = ProviderConfigSnapshot;

export interface ProviderStatusLiveOverrides {
  llmLive?: boolean;
  voiceLive?: boolean;
}

export function buildProviderStatusFromDegraded(
  degraded: DegradedModeState,
  storageStatus: ProviderPanelStatus["storage"],
  liveOverrides?: ProviderStatusLiveOverrides,
): ProviderPanelStatus {
  const llm: ProviderPanelStatus["llm"] = liveOverrides?.llmLive
    ? "live"
    : degraded.providerMode === "live"
      ? "live"
      : degraded.providerMode === "degraded"
        ? "degraded"
        : "mock";
  const radar: ProviderPanelStatus["radar"] = degraded.active.includes("fixture_radar")
    ? "fixture"
    : degraded.providerMode === "live"
      ? "live"
      : "degraded";
  const voice: ProviderPanelStatus["voice"] = liveOverrides?.voiceLive
    ? "connected"
    : degraded.active.includes("voice_disconnected")
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

/** Inverse of buildProviderStatusFromDegraded for storage rehydration. */
export function deriveDegradedFromProviderSnapshot(
  provider: ProviderPanelStatus,
  hasApiKey: boolean,
  coldStartComplete: boolean,
): DegradedModeState {
  const active: DegradedModeState["active"] = [];
  if (provider.llm === "mock") {
    active.push("mock_llm");
  }
  if (provider.radar === "fixture") {
    active.push("fixture_radar");
  }
  if (provider.voice === "disconnected") {
    active.push("voice_disconnected");
  }
  if (!coldStartComplete) {
    active.push("profile_seed_degraded");
  }
  if (provider.storage === "degraded") {
    active.push("storage_degraded");
  }

  let providerMode: DegradedModeState["providerMode"] = "mock";
  if (hasApiKey) {
    if (
      provider.llm === "live" &&
      provider.radar === "live" &&
      active.filter(
        (code) =>
          code !== "voice_disconnected" &&
          code !== "profile_seed_degraded" &&
          code !== "history_persist_warning" &&
          code !== "learning_trace_persist_warning",
      ).length === 0
    ) {
      providerMode = "live";
    } else {
      providerMode = "degraded";
    }
  }

  return { active, providerMode };
}

export const PROVIDER_STATUS_TEST_IDS = {
  llm: "provider-status-llm",
  radar: "provider-status-radar",
  voice: "provider-status-voice",
  storage: "provider-status-storage",
} as const;
