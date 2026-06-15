/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
    }) {
      return React.createElement(
        tag,
        { "data-testid": testID, onClick: onPress },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    TextInput: RN("input"),
    ScrollView: RN("div"),
    SafeAreaView: RN("div"),
    StatusBar: () => null,
    Modal: ({
      children,
      visible,
    }: {
      children?: React.ReactNode;
      visible?: boolean;
    }) => (visible ? React.createElement("div", null, children) : null),
    StyleSheet: { create: (s: object) => s, hairlineWidth: 1 },
    Platform: {
      OS: "web",
      Version: "0",
      select: (o: Record<string, string>) => o.default ?? o.web ?? Object.values(o)[0],
    },
    Share: { share: vi.fn() },
  };
});

vi.mock("expo-constants", () => ({
  default: {
    nativeBuildVersion: null,
  },
}));

import { LivingBrainHome } from "./LivingBrainHome";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import { InMemoryGraphRepository, InMemoryHistoryRepository } from "@my-brain/core";

describe("LivingBrainHome", () => {
  beforeEach(() => {
    useProvisionalStore.setState({ candidates: [], lastExplanation: null });
    useMobileAppStore.setState({
      phase: "empty_invite",
      coldStartComplete: false,
      settingsOpen: false,
      storageReady: true,
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      visibleNodes: [],
      providerStatus: {
        llm: "mock",
        radar: "fixture",
        voice: "disconnected",
        storage: "ready",
      },
      persistWarnings: [],
      degraded: {
        active: ["mock_llm", "fixture_radar", "voice_disconnected", "profile_seed_degraded"],
        providerMode: "mock",
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders empty invite with degraded banner", () => {
    render(<LivingBrainHome />);
    expect(screen.getByTestId("living-brain-home")).toBeTruthy();
    expect(screen.getByTestId("degraded-mode-banner")).toBeTruthy();
    expect(screen.getByTestId("memory-core-count")).toBeTruthy();
  });

  it("adaptive_live shows radar and intents", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.8,
    });
    useMobileAppStore.setState({ phase: "adaptive_live" });
    render(<LivingBrainHome />);
    expect(screen.getByTestId("adaptive-radar")).toBeTruthy();
    expect(screen.getByTestId("intent-rail")).toBeTruthy();
  });
});
