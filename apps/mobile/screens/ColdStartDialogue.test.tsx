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
    StyleSheet: { create: (s: object) => s },
  };
});

import { ColdStartDialogue } from "./ColdStartDialogue";
import { useMobileAppStore } from "../stores/mobileAppStore";

function sendMessage(text: string) {
  const input = screen.getByTestId("cold-start-input") as HTMLInputElement;
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByTestId("cold-start-send"));
}

describe("ColdStartDialogue", () => {
  beforeEach(() => {
    useMobileAppStore.setState({
      phase: "cold_start",
      coldStartComplete: false,
      userProfile: null,
      signals: [],
      degraded: {
        active: ["profile_seed_degraded", "mock_llm", "fixture_radar", "voice_disconnected"],
        providerMode: "mock",
      },
    });
  });

  afterEach(() => cleanup());

  it("does not expose demo fixture chips on the product path", () => {
    render(<ColdStartDialogue />);
    expect(screen.queryByTestId("cold-fixture-cold-tech-tracker")).toBeNull();
    expect(screen.queryByTestId("cold-fixture-cold-learner")).toBeNull();
  });

  it("shows profile review only after three user turns (CK-10)", () => {
    render(<ColdStartDialogue />);
    sendMessage("我想学 AI 语音");
    sendMessage("也在跟进开源项目");
    expect(screen.queryByTestId("cold-start-profile-review")).toBeNull();
    expect(useMobileAppStore.getState().coldStartComplete).toBe(false);

    sendMessage("帮我记一下项目想法");
    expect(screen.getByTestId("cold-start-profile-review")).toBeTruthy();
    expect(useMobileAppStore.getState().coldStartComplete).toBe(false);
  });

  it("completes cold start only after user confirms profile and first star", () => {
    render(<ColdStartDialogue />);
    sendMessage("我想学 Rust");
    sendMessage("也在记创业想法");
    sendMessage("希望先系统学再实践");
    expect(useMobileAppStore.getState().coldStartComplete).toBe(false);
    fireEvent.click(screen.getByTestId("cold-start-confirm-profile"));
    expect(screen.getByTestId("cold-start-first-star")).toBeTruthy();
    expect(useMobileAppStore.getState().coldStartComplete).toBe(false);
    fireEvent.click(screen.getByTestId("cold-start-light-star"));

    const state = useMobileAppStore.getState();
    expect(state.coldStartComplete).toBe(true);
    expect(state.firstStarCreated).toBe(true);
    expect(state.phase).toBe("adaptive_live");
    expect(state.userProfile).not.toBeNull();
    expect(state.visibleNodes.length).toBe(1);
    expect(state.signals.length).toBeGreaterThan(0);
  });

  it("allows primary mode correction before confirm", () => {
    render(<ColdStartDialogue />);
    sendMessage("我想学 AI");
    sendMessage("也在跟进 GitHub");
    sendMessage("顺便记项目");
    const before = screen.getByTestId("cold-start-profile-summary").textContent;
    fireEvent.click(screen.getByTestId("cold-start-profile-summary"));
    const after = screen.getByTestId("cold-start-profile-summary").textContent;
    expect(after).not.toBe(before);
  });
});
