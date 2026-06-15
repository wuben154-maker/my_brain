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

import { M3VoiceDiagnosticsPanel } from "./M3VoiceDiagnosticsPanel";
import { resetVoiceSessionSingleton } from "../voice/VoiceSession";

describe("M3VoiceDiagnosticsPanel", () => {
  beforeEach(() => {
    resetVoiceSessionSingleton();
  });

  afterEach(() => cleanup());

  it("shows platform info, mock banner, and evidence template", () => {
    render(<M3VoiceDiagnosticsPanel />);
    expect(screen.getByTestId("m3-voice-diagnostics-panel")).toBeTruthy();
    expect(screen.getByTestId("m3-voice-mock-banner").textContent).toContain("mock transport");
    expect(screen.getByTestId("m3-voice-platform").textContent).toContain("android");
    expect(screen.getByTestId("m3-voice-os-version").textContent).toContain("14");
    expect(screen.getByTestId("m3-voice-build").textContent).toContain("dev/mock");
    expect(screen.getByTestId("m3-voice-evidence-template").textContent).toContain(
      "m3VoiceBargeInEvidence:",
    );
  });

  it("connects, simulates speak, barge-in shows stop latency and stopped state", async () => {
    render(<M3VoiceDiagnosticsPanel />);

    fireEvent.click(screen.getByTestId("m3-voice-connect"));
    await waitFor(() => {
      expect(screen.getByTestId("m3-voice-fsm-state").textContent).toContain("listening");
    });

    fireEvent.click(screen.getByTestId("m3-voice-simulate-speak"));
    await waitFor(() => {
      expect(screen.getByTestId("m3-voice-fsm-state").textContent).toContain("speaking");
      expect(screen.getByTestId("m3-voice-playing").textContent).toContain("是");
    });

    fireEvent.click(screen.getByTestId("m3-voice-barge-in"));
    await waitFor(() => {
      expect(screen.getByTestId("m3-voice-playing").textContent).toContain("否");
      expect(screen.getByTestId("m3-voice-stop-latency")).toBeTruthy();
      expect(screen.getByTestId("m3-voice-barge-in-result").textContent).toContain("stopped");
    });

    const evidence = screen.getByTestId("m3-voice-evidence-template").textContent ?? "";
    expect(evidence).toContain("bargeInStopLatencyMs:");
    expect(evidence).toContain("platform: android");
  });
});
