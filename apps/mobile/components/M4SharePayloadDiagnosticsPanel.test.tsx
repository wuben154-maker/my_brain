/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
      disabled,
      value,
      onChangeText,
      placeholder,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      disabled?: boolean;
      value?: string;
      onChangeText?: (text: string) => void;
      placeholder?: string;
    }) {
      if (tag === "input") {
        return React.createElement("textarea", {
          "data-testid": testID,
          value,
          placeholder,
          onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
        });
      }
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
    TextInput: RN("input"),
    StyleSheet: { create: (s: object) => s },
  };
});

import { InMemoryGraphRepository } from "@my-brain/core";

import { M4SharePayloadDiagnosticsPanel } from "./M4SharePayloadDiagnosticsPanel";
import { setMobileUrlGuardForTests } from "../capture/guardedCapture";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";

describe("M4SharePayloadDiagnosticsPanel", () => {
  beforeEach(() => {
    const graph = new InMemoryGraphRepository();
    useMobileAppStore.setState({ graph, queueSheetOpen: false });
    useProvisionalStore.setState({
      candidates: [],
      lastShareIntakeDiagnostic: null,
      lastSsrfHint: null,
    });
    setMobileUrlGuardForTests({
      resolveDns: async () => ["93.184.216.34"],
      fetch: async () => ({ status: 200, body: new TextEncoder().encode("ok") }),
    });
  });

  afterEach(() => {
    setMobileUrlGuardForTests(null);
    cleanup();
  });

  it("shows mock banner and all manifest fixture buttons", () => {
    render(<M4SharePayloadDiagnosticsPanel />);
    expect(screen.getByTestId("m4-share-payload-diagnostics-panel")).toBeTruthy();
    expect(screen.getByTestId("m4-share-mock-banner").textContent).toContain("mock/prep only");
    expect(screen.getByTestId("m4-share-fixture-share-android-url-ok")).toBeTruthy();
    expect(screen.getByTestId("m4-share-fixture-share-voice-disabled")).toBeTruthy();
  });

  it("injects android url fixture into provisional queue with diagnostic", async () => {
    render(<M4SharePayloadDiagnosticsPanel />);
    fireEvent.click(screen.getByTestId("m4-share-fixture-share-android-url-ok"));

    await waitFor(() => {
      expect(screen.getByTestId("m4-share-last-ok").textContent).toContain("true");
      expect(screen.getByTestId("m4-share-last-source").textContent).toContain("link");
      expect(screen.getByTestId("m4-share-graph-nodes").textContent).toContain("0");
    });

    expect(useMobileAppStore.getState().queueSheetOpen).toBe(true);
    expect(useProvisionalStore.getState().candidates.length).toBe(1);
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
  });

  it("shows user-visible hint for http denied fixture without queue open", async () => {
    render(<M4SharePayloadDiagnosticsPanel />);
    fireEvent.click(screen.getByTestId("m4-share-fixture-share-http-denied"));

    await waitFor(() => {
      expect(screen.getByTestId("m4-share-last-ok").textContent).toContain("false");
      expect(screen.getByTestId("m4-share-last-code").textContent).toContain(
        "SHARE_PAYLOAD_URL_INVALID",
      );
      expect(screen.getByTestId("m4-share-last-hint").textContent).toContain("https");
    });

    expect(useMobileAppStore.getState().queueSheetOpen).toBe(false);
    expect(useProvisionalStore.getState().candidates.length).toBe(0);
  });

  it("voice disabled fixture shows voice_disconnected hint", async () => {
    render(<M4SharePayloadDiagnosticsPanel />);
    fireEvent.click(screen.getByTestId("m4-share-fixture-share-voice-disabled"));

    await waitFor(() => {
      expect(screen.getByTestId("m4-share-last-code").textContent).toContain(
        "SHARE_INTAKE_VOICE_DISABLED",
      );
      expect(screen.getByTestId("m4-share-last-hint").textContent).toContain("voice_disconnected");
    });
  });
});
