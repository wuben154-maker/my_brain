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
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    useMobileAppStore.setState({
      queueSheetOpen: true,
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
      pendingIngestProposal: null,
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

  it("shows user-safe SSRF hint on denied link candidate", async () => {
    await useProvisionalStore.getState().addLinkCapture("私网", "http://example.com/x");
    render(<ProvisionalQueueSheet />);
    const items = useProvisionalStore.getState().candidates;
    const id = items[0]!.id;
    const hint = screen.getByTestId(`provisional-ssrf-${id}`).textContent ?? "";
    expect(hint).toContain("仅支持安全链接");
    expect(hint).not.toContain("SSRF_");
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
  });

  it("shows product voice-unavailable banner without engineering labels", () => {
    render(<ProvisionalQueueSheet />);
    const banner = screen.getByTestId("voice-disconnected-banner").textContent ?? "";
    expect(banner).toContain("语音暂不可用");
    expect(banner).not.toMatch(/M3|未 PASS|voice_disconnected|S\d+/);
  });

  it("sanitizes engineering share hints in ssrf banner", () => {
    useProvisionalStore.setState({
      lastSsrfHint: "voice_disconnected：M3 未 PASS，语音笔记分享已禁用",
    });
    render(<ProvisionalQueueSheet />);
    const hint = screen.getByTestId("ssrf-hint-banner").textContent ?? "";
    expect(hint).toContain("语音笔记暂不可用");
    expect(hint).not.toMatch(/M3|未 PASS|voice_disconnected|S\d+/);
  });

  it("maps provisional status to zh-CN labels in meta line", () => {
    const c = useProvisionalStore.getState().addTextCapture("待确认笔记", "learning");
    render(<ProvisionalQueueSheet />);
    const meta = screen.getByTestId(`provisional-meta-${c.id}`).textContent ?? "";
    expect(meta).toContain("待确认");
    expect(meta).not.toContain("pending");
  });

  it("does not show queue actions until user selects a pending item", () => {
    useProvisionalStore.getState().addTextCapture("待确认");
    render(<ProvisionalQueueSheet />);
    expect(screen.queryByTestId("provisional-queue-context-bar")).toBeNull();
    expect(screen.getByTestId("provisional-select-hint").textContent).toContain(
      "请选择一条星尘",
    );
  });

  it("selecting a row enables queue actions bound to that item", () => {
    const c = useProvisionalStore.getState().addTextCapture("待确认");
    render(<ProvisionalQueueSheet />);
    fireEvent.click(screen.getByTestId(`provisional-item-${c.id}`));
    expect(screen.getByTestId("provisional-queue-context-bar")).toBeTruthy();
    expect(useMobileAppStore.getState().conversation.activeProvisionalId).toBe(c.id);
  });

  it("queue context bar uses inbox label variant", () => {
    const c = useProvisionalStore.getState().addTextCapture("待确认");
    render(<ProvisionalQueueSheet />);
    fireEvent.click(screen.getByTestId(`provisional-item-${c.id}`));
    expect(screen.getByTestId("provisional-queue-context-bar-ingest").textContent).toBe(
      "点亮成星",
    );
    expect(screen.getByTestId("provisional-queue-context-bar-skip").textContent).toBe("先放着");
    expect(screen.getByTestId("provisional-queue-context-bar-detail").textContent).toBe(
      "整理一下",
    );
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
    fireEvent.click(screen.getByTestId("provisional-queue-context-bar-skip"));
    expect(useProvisionalStore.getState().candidates.find((x) => x.id === c.id)?.status).toBe("rejected");
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
  });

  it("ingest opens ContextDecisionSheet without permanent graph write", () => {
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");
    const graph = useMobileAppStore.getState().graph;
    const c = useProvisionalStore.getState().addTextCapture("待点亮星尘");

    render(<ProvisionalQueueSheet />);
    fireEvent.click(screen.getByTestId(`provisional-item-${c.id}`));
    fireEvent.click(screen.getByTestId("provisional-queue-context-bar-ingest"));

    expect(spy).not.toHaveBeenCalled();
    expect(graph.countVisibleNodes()).toBe(0);
    expect(useMobileAppStore.getState().pendingIngestProposal).not.toBeNull();
    expect(screen.getByTestId("provisional-queue-confirm-sheet")).toBeTruthy();
    expect(screen.getByText(/不会写入永久星图/)).toBeTruthy();
    expect(useMobileAppStore.getState().conversation.activeProvisionalId).toBe(c.id);
  });

  it("confirm sheet ingest writes graph after explicit confirmation", () => {
    const graph = useMobileAppStore.getState().graph;
    const c = useProvisionalStore.getState().addTextCapture("确认后点亮");

    render(<ProvisionalQueueSheet />);
    fireEvent.click(screen.getByTestId(`provisional-item-${c.id}`));
    fireEvent.click(screen.getByTestId("provisional-queue-context-bar-ingest"));
    fireEvent.click(screen.getByTestId("provisional-queue-confirm-sheet-ingest"));

    expect(graph.countVisibleNodes()).toBeGreaterThan(0);
    expect(
      useProvisionalStore.getState().candidates.find((x) => x.id === c.id)?.status,
    ).toBe("confirmed");
    expect(useMobileAppStore.getState().pendingIngestProposal).toBeNull();
  });

  it("ingest targets the selected row when multiple pending items exist", () => {
    useProvisionalStore.getState().addTextCapture("第一条");
    const second = useProvisionalStore.getState().addTextCapture("第二条");

    render(<ProvisionalQueueSheet />);
    fireEvent.click(screen.getByTestId(`provisional-item-${second.id}`));
    fireEvent.click(screen.getByTestId("provisional-queue-context-bar-ingest"));

    expect(useMobileAppStore.getState().conversation.activeProvisionalId).toBe(second.id);
    expect(useMobileAppStore.getState().pendingIngestProposal?.concept).toContain("第二条");
  });

  it("detail still delegates explain_more without closing queue sheet", () => {
    const c = useProvisionalStore.getState().addTextCapture("讲细点");
    useMobileAppStore.getState().setConversation({
      phase: "provisional_pending",
      turns: [],
      activeSignalId: null,
      activeProvisionalId: c.id,
      lastExplanation: null,
    });

    render(<ProvisionalQueueSheet />);
    fireEvent.click(screen.getByTestId("provisional-queue-context-bar-detail"));

    expect(useMobileAppStore.getState().queueSheetOpen).toBe(true);
    expect(useProvisionalStore.getState().lastExplanation).not.toBeNull();
  });
});
