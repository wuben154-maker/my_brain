import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdaptiveSignal } from "@my-brain/core";
import { InMemoryGraphRepository, InMemoryHistoryRepository } from "@my-brain/core";

const liveSignal: AdaptiveSignal = {
  sourceType: "radar",
  userModeFit: "tech_tracker",
  freshness: 0.9,
  evidenceRefs: ["radar:github:gh-101", "source:github-trending"],
  confidence: 0.91,
  privacyLevel: "local_only",
  suggestedIntent: "explain_more",
};

const resolveMobileRadarSignals = vi.fn(async () => ({
  signals: [liveSignal],
  providerMode: "live" as const,
  activeCodes: [],
  sourceKind: "live" as const,
  degradedReasons: [],
}));

vi.mock("../radar/mobileRadarRuntime", () => ({
  resolveMobileRadarSignals,
}));

describe("mobileAppStore radar runtime", () => {
  beforeEach(async () => {
    const { useMobileAppStore } = await import("./mobileAppStore");
    resolveMobileRadarSignals.mockClear();
    useMobileAppStore.setState({
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      storageReady: false,
      userProfile: null,
      signals: [],
      degraded: {
        active: ["mock_llm", "fixture_radar", "voice_disconnected"],
        providerMode: "mock",
      },
      providerStatus: {
        llm: "mock",
        radar: "fixture",
        voice: "disconnected",
        storage: "ready",
      },
    });
  });

  it("refreshes cold-start radar through mobile live runtime", async () => {
    const { useMobileAppStore } = await import("./mobileAppStore");
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.9,
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(resolveMobileRadarSignals).toHaveBeenCalledTimes(1);

    const state = useMobileAppStore.getState();
    expect(state.signals).toEqual([liveSignal]);
    expect(state.providerStatus.radar).toBe("live");
    expect(state.degraded.active).not.toContain("fixture_radar");
  });
});
