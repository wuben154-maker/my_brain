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
    ScrollView: RN("div"),
    StyleSheet: { create: (s: object) => s },
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

import { PROVIDER_STATUS_TEST_IDS } from "@my-brain/core";
import { SettingsScreen } from "./LivingBrainHome";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { resetVoiceSessionSingleton } from "../voice/VoiceSession";

describe("Settings provider status panel", () => {
  beforeEach(() => {
    resetVoiceSessionSingleton();
    useMobileAppStore.setState({
      settingsOpen: true,
      providerStatus: {
        llm: "mock",
        radar: "fixture",
        voice: "disconnected",
        storage: "ready",
        lastErrorCode: "ProviderConfigError",
      },
      persistWarnings: ["history_persist_warning"],
      degraded: {
        active: ["mock_llm", "fixture_radar", "voice_disconnected"],
        providerMode: "mock",
      },
    });
  });

  afterEach(() => cleanup());

  it("renders provider panel testIds and ProviderConfigError", () => {
    render(<SettingsScreen />);
    expect(screen.getByTestId("provider-status-panel")).toBeTruthy();
    expect(screen.getByTestId(PROVIDER_STATUS_TEST_IDS.llm).textContent).toContain("mock");
    expect(screen.getByTestId(PROVIDER_STATUS_TEST_IDS.voice).textContent).toContain(
      "disconnected",
    );
    expect(screen.getByTestId("settings-voice-disconnected").textContent).toContain(
      "语音：未连接",
    );
    expect(screen.getByTestId("provider-config-error")).toBeTruthy();
    expect(screen.getByTestId("persist-warning-banner")).toBeTruthy();
  });

  it("renders M3 voice barge-in diagnostics entry", () => {
    render(<SettingsScreen />);
    expect(screen.getByTestId("m3-voice-diagnostics-panel")).toBeTruthy();
    expect(screen.getByTestId("m3-voice-mock-banner").textContent).toContain("mock transport");
    expect(screen.getByTestId("m3-voice-connect")).toBeTruthy();
    expect(screen.getByTestId("m3-voice-barge-in")).toBeTruthy();
    expect(screen.getByTestId("m3-voice-evidence-template")).toBeTruthy();
  });
});
