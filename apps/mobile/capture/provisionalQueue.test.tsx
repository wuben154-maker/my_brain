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

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
      onClick,
      disabled,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      onClick?: () => void;
      disabled?: boolean;
    }) {
      return React.createElement(
        tag,
        { "data-testid": testID, onClick: onPress ?? onClick, disabled },
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
    StyleSheet: { create: (s: object) => s },
  };
});

import { ProvisionalQueueSheet } from "../components/ProvisionalQueueSheet";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";

describe("provisionalQueue mobile", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useMobileAppStore.setState({
      queueSheetOpen: true,
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      conversation: {
        phase: "idle",
        turns: [],
        activeSignalId: null,
        activeProvisionalId: null,
        lastExplanation: null,
      },
    });
    useProvisionalStore.setState({ candidates: [], lastExplanation: null, lastSsrfHint: null });
  });

  it("renders pending candidates with source metadata", () => {
    const c = useProvisionalStore.getState().addTextCapture("学习笔记", "learning");
    render(<ProvisionalQueueSheet />);
    expect(screen.getByTestId("provisional-queue-sheet")).toBeTruthy();
    expect(screen.getByTestId(`provisional-item-${c.id}`)).toBeTruthy();
    expect(screen.getByTestId(`provisional-meta-${c.id}`).textContent).toContain("学习");
  });

  it("shows SSRF reject code on denied link candidate", async () => {
    await useProvisionalStore.getState().addLinkCapture("私网", "http://example.com/x");
    render(<ProvisionalQueueSheet />);
    const items = useProvisionalStore.getState().candidates;
    const id = items[0]!.id;
    expect(screen.getByTestId(`provisional-ssrf-${id}`).textContent).toContain("SSRF_SCHEME_DENIED");
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
  });

  it("shows voice_disconnected banner when M3 not PASS", () => {
    render(<ProvisionalQueueSheet />);
    expect(screen.getByTestId("voice-disconnected-banner").textContent).toContain("voice_disconnected");
  });

  it("intent rail delegates to Conductor via dispatchIntent", () => {
    const c = useProvisionalStore.getState().addTextCapture("待确认");
    useMobileAppStore.getState().setConversation({
      phase: "provisional_pending",
      turns: [],
      activeSignalId: null,
      activeProvisionalId: c.id,
      lastExplanation: null,
    });
    render(<ProvisionalQueueSheet />);
    fireEvent.click(screen.getByTestId("intent-skip"));
    expect(useProvisionalStore.getState().candidates.find((x) => x.id === c.id)?.status).toBe("rejected");
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
  });
});
