import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createEmptyCorrectionState,
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "@my-brain/core";

import { useMobileAppStore, selectMainRouteEnabledFromStore } from "./mobileAppStore";

vi.mock("../storage/storageSession", () => ({
  getStorageSession: () => null,
}));

describe("mobileAppStore setHasApiKey degraded", () => {
  beforeEach(() => {
    useMobileAppStore.setState({
      coldStartComplete: true,
      hasApiKey: true,
      providerVerified: false,
      providerLlmLive: false,
      providerVoiceLive: false,
      providerStatus: {
        llm: "live",
        radar: "live",
        voice: "mock",
        storage: "ready",
      },
      degraded: {
        active: [],
        providerMode: "live",
      },
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      correctionState: createEmptyCorrectionState(),
      storageReady: false,
    });
  });

  it("setHasApiKey(false) derives degraded from snapshot without profile_seed_degraded", () => {
    useMobileAppStore.getState().setHasApiKey(false);

    const state = useMobileAppStore.getState();
    expect(state.hasApiKey).toBe(false);
    expect(state.providerVerified).toBe(false);
    expect(state.degraded.providerMode).toBe("mock");
    expect(state.degraded.active).toContain("mock_llm");
    expect(state.degraded.active).toContain("fixture_radar");
    expect(state.degraded.active).not.toContain("profile_seed_degraded");
    expect(state.providerStatus.llm).toBe("mock");
  });

  it("completeColdStart clears profile_seed_degraded from degraded.active", () => {
    useMobileAppStore.setState({
      coldStartComplete: false,
      degraded: {
        active: ["mock_llm", "fixture_radar", "voice_disconnected", "profile_seed_degraded"],
        providerMode: "mock",
      },
    });

    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });

    const state = useMobileAppStore.getState();
    expect(state.coldStartComplete).toBe(true);
    expect(state.phase).toBe("adaptive_live");
    expect(state.degraded.active).not.toContain("profile_seed_degraded");
    expect(state.degraded.active).toContain("mock_llm");
  });
});

describe("mobileAppStore CK-04 provider route gate", () => {
  beforeEach(() => {
    useMobileAppStore.setState({
      coldStartComplete: false,
      hasApiKey: false,
      providerVerified: false,
      providerLlmLive: false,
      providerVoiceLive: false,
      phase: "empty_invite",
      storageReady: true,
    });
  });

  it("fresh install with no keys blocks main route", () => {
    expect(selectMainRouteEnabledFromStore(useMobileAppStore.getState())).toBe(false);
  });

  it("only ModelScope live still blocks main route", () => {
    useMobileAppStore.getState().applyProviderVerification({
      verified: false,
      llmLive: true,
      voiceLive: false,
    });
    expect(selectMainRouteEnabledFromStore(useMobileAppStore.getState())).toBe(false);
  });

  it("only Doubao live still blocks main route", () => {
    useMobileAppStore.getState().applyProviderVerification({
      verified: false,
      llmLive: false,
      voiceLive: true,
    });
    expect(selectMainRouteEnabledFromStore(useMobileAppStore.getState())).toBe(false);
  });

  it("both providers live enables main route", () => {
    useMobileAppStore.getState().applyProviderVerification({
      verified: true,
      llmLive: true,
      voiceLive: true,
    });
    expect(selectMainRouteEnabledFromStore(useMobileAppStore.getState())).toBe(true);
  });

  it("bad key clears verification via setHasApiKey(false)", () => {
    useMobileAppStore.getState().applyProviderVerification({
      verified: true,
      llmLive: true,
      voiceLive: true,
    });
    useMobileAppStore.getState().setHasApiKey(false);
    expect(useMobileAppStore.getState().providerVerified).toBe(false);
    expect(selectMainRouteEnabledFromStore(useMobileAppStore.getState())).toBe(false);
  });
});
