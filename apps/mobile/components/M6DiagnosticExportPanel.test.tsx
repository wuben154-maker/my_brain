/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    StyleSheet: { create: (s: object) => s },
    Platform: { OS: "ios" },
    Share: { share: vi.fn().mockResolvedValue(undefined) },
  };
});

vi.mock("../diagnostics/exportDiagnostics", () => ({
  buildDiagnosticExportPayload: vi.fn(() => ({
    ok: true,
    json: '{"schemaVersion":1,"events":[]}',
    eventCount: 0,
  })),
}));

import { M6DiagnosticExportPanel } from "./M6DiagnosticExportPanel";

describe("M6DiagnosticExportPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => cleanup());

  it("renders export panel with mock/degraded banner", () => {
    render(<M6DiagnosticExportPanel />);
    expect(screen.getByTestId("m6-diagnostic-export-panel")).toBeTruthy();
    expect(screen.getByTestId("m6-diagnostic-mock-banner").textContent).toContain(
      "mock/degraded",
    );
  });

  it("updates status on preview scan", () => {
    render(<M6DiagnosticExportPanel />);
    fireEvent.click(screen.getByTestId("m6-diagnostic-preview"));
    expect(screen.getByTestId("m6-diagnostic-status").textContent).toContain("预览通过");
  });
});
