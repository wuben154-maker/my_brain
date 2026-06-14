/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
      ...rest
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      [key: string]: unknown;
    }) {
      return React.createElement(
        tag,
        { "data-testid": testID, onClick: onPress, ...rest },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    ScrollView: RN("div"),
    StyleSheet: { create: (s: object) => s, hairlineWidth: 1 },
  };
});

import type { AdaptiveSignal } from "@my-brain/core";
import { AdaptiveRadar } from "./AdaptiveRadar";

const signals: AdaptiveSignal[] = [
  {
    sourceType: "learning",
    userModeFit: "learner",
    freshness: 0.9,
    evidenceRefs: ["fixture:learner:0"],
    confidence: 0.8,
    privacyLevel: "local_only",
    suggestedIntent: "explain_more",
  },
];

describe("AdaptiveRadar", () => {
  it("renders mode-specific primary signal", () => {
    render(<AdaptiveRadar signals={signals} onSelect={() => {}} />);
    expect(screen.getByTestId("adaptive-radar")).toBeTruthy();
    expect(screen.getByText(/学习者/)).toBeTruthy();
  });
});
