/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
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
    ScrollView: RN("div"),
    StyleSheet: { create: (s: object) => s },
  };
});

import { ProfileReview } from "./ProfileReview";
import { useMobileAppStore } from "../stores/mobileAppStore";

describe("ProfileReview", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useMobileAppStore.setState({
      userProfile: null,
      correctionState: { traits: [], corrections: [], suppressionList: [] },
      profileReviewOpen: false,
    });
  });

  it("shows empty before cold start", () => {
    render(<ProfileReview />);
    expect(screen.getByText(/完成冷启动/)).toBeTruthy();
  });

  it("allows suppress and reroutes", () => {
    useMobileAppStore.getState().completeColdStart({
      primaryMode: "learner",
      secondaryModes: [],
      confidence: 0.7,
    });
    render(<ProfileReview />);
    expect(screen.getByText(/来源：从对话推断/)).toBeTruthy();
    fireEvent.click(screen.getByTestId("profile-suppress-mode-learner"));
    expect(useMobileAppStore.getState().correctionState.suppressionList).toContain(
      "mode-learner",
    );
  });
});
