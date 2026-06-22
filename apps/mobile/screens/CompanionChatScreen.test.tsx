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
        onPress ? "button" : tag,
        { "data-testid": testID, onClick: onPress },
        children,
      );
    };
  function MockTextInput({
    testID,
    onChangeText,
    value,
  }: {
    testID?: string;
    onChangeText?: (text: string) => void;
    value?: string;
  }) {
    return React.createElement("input", {
      "data-testid": testID,
      value: value ?? "",
      onChange: (event: { target: { value: string } }) => onChangeText?.(event.target.value),
    });
  }
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    ScrollView: RN("div"),
    TextInput: MockTextInput,
    StyleSheet: { create: (s: object) => s, absoluteFillObject: {} },
  };
});

import { createEphemeralConversation, InMemoryGraphRepository, InMemoryHistoryRepository } from "@my-brain/core";

import { CompanionChatScreen } from "./CompanionChatScreen";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";

function sendMessage(text: string) {
  const input = screen.getByTestId("companion-chat-input") as HTMLInputElement;
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByTestId("companion-chat-send"));
}

describe("CompanionChatScreen — CK-12 ephemeral", () => {
  beforeEach(() => {
    useMobileAppStore.setState({
      phase: "adaptive_live",
      coldStartComplete: true,
      companionChatOpen: true,
      ephemeralChat: createEphemeralConversation(),
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
    });
    useProvisionalStore.setState({
      candidates: [],
      lastExplanation: null,
      lastSsrfHint: null,
      lastShareIntakeDiagnostic: null,
    });
  });

  afterEach(() => cleanup());

  it("shows ephemeral context card and explicit save affordances", () => {
    render(<CompanionChatScreen />);
    expect(screen.getByTestId("companion-chat-context-card")).toBeTruthy();
    expect(screen.getByTestId("companion-chat-save-hint")).toBeTruthy();
    expect(screen.getByTestId("companion-chat-reject-memory")).toBeTruthy();
  });

  it("ten casual turns do not increase permanent graph nodes", () => {
    render(<CompanionChatScreen />);
    const before = useMobileAppStore.getState().graph.countVisibleNodes();
    for (let i = 0; i < 10; i += 1) {
      sendMessage(`陪聊 ${i + 1}：最近有点焦虑`);
    }
    const after = useMobileAppStore.getState().graph.countVisibleNodes();
    expect(after).toBe(before);
    expect(useMobileAppStore.getState().ephemeralChat?.totalUserTurns).toBe(10);
  });

  it("explicit save creates pending candidate without permanent node", () => {
    render(<CompanionChatScreen />);
    const beforeNodes = useMobileAppStore.getState().graph.countVisibleNodes();
    sendMessage("帮我把这句记下来");
    const pending = useProvisionalStore.getState().listPending();
    expect(pending.length).toBe(1);
    expect(pending[0]?.status).toBe("pending");
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(beforeNodes);
  });

  it("save intent assistant copy distinguishes candidate from permanent asset", () => {
    render(<CompanionChatScreen />);
    sendMessage("帮我把这句记下来");
    expect(screen.getByText(/已生成资产候选/)).toBeTruthy();
    expect(screen.getByText(/仍需你确认才会入库/)).toBeTruthy();
  });

  it("记下来 pill creates pending candidate without permanent node", () => {
    render(<CompanionChatScreen />);
    sendMessage("最近项目推进慢");
    const beforeNodes = useMobileAppStore.getState().graph.countVisibleNodes();
    fireEvent.click(screen.getByTestId("companion-chat-save-hint"));
    const pending = useProvisionalStore.getState().listPending();
    expect(pending.length).toBe(1);
    expect(pending[0]?.status).toBe("pending");
    expect(pending[0]?.summary).toContain("最近项目推进慢");
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(beforeNodes);
    expect(screen.getByText(/确认前不会写入永久星图/)).toBeTruthy();
  });

  it("reject-memory pill sets memoryRejected without graph ingest", () => {
    render(<CompanionChatScreen />);
    sendMessage("最近项目推进慢");
    const before = useMobileAppStore.getState().graph.countVisibleNodes();
    fireEvent.click(screen.getByTestId("companion-chat-reject-memory"));
    const chat = useMobileAppStore.getState().ephemeralChat;
    expect(chat?.memoryRejected).toBe(true);
    expect(chat?.turns.at(-1)?.text).toContain("不会写入");
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(before);
  });

  it("typed reject phrase sets memoryRejected without graph ingest", () => {
    render(<CompanionChatScreen />);
    sendMessage("最近项目推进慢");
    const before = useMobileAppStore.getState().graph.countVisibleNodes();
    sendMessage("别记录这个");
    const chat = useMobileAppStore.getState().ephemeralChat;
    expect(chat?.memoryRejected).toBe(true);
    expect(chat?.turns.some((t) => t.role === "user" && t.text === "别记录这个")).toBe(true);
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(before);
  });
});
