/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "@my-brain/core";
import * as ingestModule from "@my-brain/core";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
      onClick,
      disabled,
      accessibilityLabel,
      accessibilityRole,
      accessibilityHint,
      accessibilityState,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      onClick?: () => void;
      disabled?: boolean;
      accessibilityLabel?: string;
      accessibilityRole?: string;
      accessibilityHint?: string;
      accessibilityState?: { selected?: boolean };
    }) {
      return React.createElement(
        onPress ? "button" : tag,
        {
          "data-testid": testID,
          onClick: onPress ?? onClick,
          disabled,
          "aria-label": accessibilityLabel,
          role: accessibilityRole,
          title: accessibilityHint,
          "aria-selected": accessibilityState?.selected,
        },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    ScrollView: RN("div"),
    Modal: ({
      children,
      visible,
      testID,
    }: {
      children?: React.ReactNode;
      visible?: boolean;
      testID?: string;
    }) => (visible ? React.createElement("div", { "data-testid": testID }, children) : null),
    TextInput: RN("input"),
    StyleSheet: { create: (s: object) => s },
    useColorScheme: () => "dark",
  };
});

import { CaptureInboxScreen } from "../screens/CaptureInboxScreen";
import { NavigationProvider } from "../navigation/NavigationContext";
import { ThemeProvider } from "../theme/ThemeProvider";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";

function renderCaptureInbox() {
  return render(
    <ThemeProvider>
      <NavigationProvider>
        <CaptureInboxScreen />
      </NavigationProvider>
    </ThemeProvider>,
  );
}

describe("CaptureInboxScreen", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    useMobileAppStore.setState({
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      pendingIngestProposal: null,
      degraded: {
        active: ["mock_llm", "fixture_radar", "voice_disconnected"],
        providerMode: "mock",
      },
      conversation: {
        phase: "idle",
        turns: [],
        activeSignalId: null,
        activeProvisionalId: null,
        lastExplanation: null,
      },
    });
    useProvisionalStore.setState({
      candidates: [],
      lastExplanation: null,
      lastSsrfHint: null,
    });
  });

  it("renders header, subtitle, and empty state copy", () => {
    renderCaptureInbox();
    expect(screen.getByTestId("capture-inbox-screen")).toBeTruthy();
    expect(screen.getByTestId("capture-inbox-header-title").textContent).toBe(
      "待点亮星尘",
    );
    expect(screen.getByTestId("capture-inbox-header-subtitle").textContent).toBe(
      "候选先在这里，确认前不会进入永久星图。",
    );
    expect(screen.getByTestId("capture-inbox-empty").textContent).toContain(
      "星尘 inbox 还是空的",
    );
    expect(screen.getByTestId("capture-inbox-degraded-banner")).toBeTruthy();
  });

  it("groups pending rows with whyMaybe and four actions", async () => {
    const text = useProvisionalStore.getState().addTextCapture(
      "面试时要讲清楚为什么不是普通 RAG",
    );
    await useProvisionalStore.getState().addLinkCapture(
      "Graphiti episode",
      "https://example.com/a",
    );

    renderCaptureInbox();

    expect(screen.getByTestId("capture-inbox-queue-count").textContent).toContain("2 条待确认");
    expect(screen.getByTestId(`capture-inbox-row-${text.id}-why-maybe`)).toBeTruthy();
    expect(screen.getByTestId(`capture-inbox-row-${text.id}-action-light-up`)).toBeTruthy();
    expect(screen.getByTestId(`capture-inbox-row-${text.id}-action-keep`)).toBeTruthy();
    expect(screen.getByTestId(`capture-inbox-row-${text.id}-action-discard`)).toBeTruthy();
    expect(screen.getByTestId(`capture-inbox-row-${text.id}-action-organize`)).toBeTruthy();
    expect(screen.getByTestId("capture-inbox-section-quick_note")).toBeTruthy();
  });

  it("light up proposes ingest without creating permanent node", async () => {
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");
    const graph = useMobileAppStore.getState().graph;
    const c = useProvisionalStore.getState().addTextCapture("待点亮条目");

    renderCaptureInbox();
    fireEvent.click(screen.getByTestId(`capture-inbox-row-${c.id}-action-light-up`));

    expect(spy).not.toHaveBeenCalled();
    expect(graph.countVisibleNodes()).toBe(0);
    expect(useMobileAppStore.getState().pendingIngestProposal).not.toBeNull();
    expect(useMobileAppStore.getState().conversation.activeProvisionalId).toBe(c.id);
  });

  it("discard removes provisional without graph write", () => {
    const graph = useMobileAppStore.getState().graph;
    const c = useProvisionalStore.getState().addTextCapture("丢掉这条");

    renderCaptureInbox();
    fireEvent.click(screen.getByTestId(`capture-inbox-row-${c.id}-action-discard`));

    expect(
      useProvisionalStore.getState().candidates.find((x) => x.id === c.id)?.status,
    ).toBe("rejected");
    expect(graph.countVisibleNodes()).toBe(0);
  });

  it("organize opens ContextDecisionSheet", () => {
    const c = useProvisionalStore.getState().addTextCapture("整理占位");

    renderCaptureInbox();
    fireEvent.click(screen.getByTestId(`capture-inbox-row-${c.id}-action-organize`));

    expect(screen.getAllByTestId("context-decision-sheet").length).toBeGreaterThan(0);
    expect(screen.getByText(/确认前不会写入永久星图/)).toBeTruthy();
  });
});
