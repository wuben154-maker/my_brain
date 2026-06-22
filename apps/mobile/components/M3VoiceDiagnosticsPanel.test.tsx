/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("expo-constants", () => ({
  default: {
    nativeBuildVersion: null,
  },
}));

vi.mock("../env/readAppEnv", () => ({
  readMobileAppEnv: vi.fn(() => ({
    runtime: "mobile",
    providerModes: { voice: "mock", llm: "mock", newsRadar: "mock" },
  })),
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => undefined),
  deleteItemAsync: vi.fn(async () => undefined),
}));

const setVoiceDisconnected = vi.fn();
const clearVoiceDisconnected = vi.fn();

vi.mock("../stores/mobileAppStore", () => ({
  useMobileAppStore: (selector: (state: {
    setVoiceDisconnected: typeof setVoiceDisconnected;
  }) => unknown) =>
    selector({
      setVoiceDisconnected: (active: boolean) => {
        if (active) {
          setVoiceDisconnected();
        } else {
          clearVoiceDisconnected();
        }
      },
    }),
}));

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
      disabled,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      disabled?: boolean;
    }) {
      return React.createElement(
        tag,
        { "data-testid": testID, onClick: disabled ? undefined : onPress },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    ScrollView: RN("div"),
    StyleSheet: { create: (s: object) => s },
    Platform: { OS: "android", Version: "14", select: (o: Record<string, string>) => o.android },
    Share: { share: vi.fn() },
  };
});

import { M3VoiceDiagnosticsPanel, M3_DIAG_LONG_SPEAK_DURATION_MS } from "./M3VoiceDiagnosticsPanel";
import { resetVoiceSessionSingleton } from "../voice/VoiceSession";

describe("M3VoiceDiagnosticsPanel", () => {
  beforeEach(() => {
    resetVoiceSessionSingleton();
    setVoiceDisconnected.mockClear();
    clearVoiceDisconnected.mockClear();
  });

  afterEach(() => cleanup());

  it("shows platform info, mock banner, long-speak hint, and evidence template", () => {
    render(<M3VoiceDiagnosticsPanel />);
    expect(screen.getByTestId("m3-voice-diagnostics-panel")).toBeTruthy();
    expect(screen.getByTestId("m3-voice-mock-banner").textContent).toContain("长播报采证模式");
    expect(screen.getByTestId("m3-voice-mock-banner").textContent).toContain("mock transport");
    expect(screen.getByTestId("m3-voice-long-speak-hint").textContent).toContain("开始长播报（10 秒）");
    expect(screen.getByTestId("m3-voice-platform").textContent).toContain("android");
    expect(screen.getByTestId("m3-voice-os-version").textContent).toContain("14");
    expect(screen.getByTestId("m3-voice-build").textContent).toContain("dev/mock");
    expect(screen.getByTestId("m3-voice-evidence-template").textContent).toContain(
      "m3VoiceBargeInEvidence:",
    );
  });

  it("connects, starts long speak, stays speaking, then barge-in shows stop latency and stopped", async () => {
    render(<M3VoiceDiagnosticsPanel />);

    fireEvent.click(screen.getByTestId("m3-voice-connect"));
    await waitFor(() => {
      expect(screen.getByTestId("m3-voice-fsm-state").textContent).toContain("listening");
    });

    fireEvent.click(screen.getByTestId("m3-voice-long-speak"));
    await waitFor(() => {
      expect(screen.getByTestId("m3-voice-fsm-state").textContent).toContain("speaking");
      expect(screen.getByTestId("m3-voice-playing").textContent).toContain("是");
    });

    vi.useFakeTimers();
    vi.advanceTimersByTime(M3_DIAG_LONG_SPEAK_DURATION_MS / 2);
    expect(screen.getByTestId("m3-voice-fsm-state").textContent).toContain("speaking");
    expect(screen.getByTestId("m3-voice-playing").textContent).toContain("是");
    vi.useRealTimers();

    fireEvent.click(screen.getByTestId("m3-voice-barge-in"));
    await waitFor(() => {
      expect(screen.getByTestId("m3-voice-playing").textContent).toContain("否");
      expect(screen.getByTestId("m3-voice-stop-latency")).toBeTruthy();
      expect(screen.getByTestId("m3-voice-barge-in-result").textContent).toContain("stopped");
    });

    const evidence = screen.getByTestId("m3-voice-evidence-template").textContent ?? "";
    expect(evidence).toContain("bargeInStopLatencyMs:");
    expect(evidence).toContain("result: stopped");
    expect(evidence).toContain("platform: android");
  });

  it("simulate disconnect drives voice_disconnected via store callback", async () => {
    render(<M3VoiceDiagnosticsPanel />);
    fireEvent.click(screen.getByTestId("m3-voice-connect"));
    await waitFor(() => {
      expect(clearVoiceDisconnected).toHaveBeenCalled();
    });
    fireEvent.click(screen.getByTestId("m3-voice-simulate-disconnect"));
    await waitFor(() => {
      expect(setVoiceDisconnected).toHaveBeenCalled();
    });
  });
});
