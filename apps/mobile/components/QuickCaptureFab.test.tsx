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
    TextInput: RN("input"),
    Modal: ({
      children,
      visible,
    }: {
      children?: React.ReactNode;
      visible?: boolean;
    }) => (visible ? React.createElement("div", null, children) : null),
    StyleSheet: { create: (s: object) => s },
  };
});

import { QuickCaptureFab } from "./QuickCaptureFab";
import { useProvisionalStore } from "../stores/provisionalStore";

describe("QuickCaptureFab", () => {
  it("renders capture entry", () => {
    useProvisionalStore.setState({ candidates: [] });
    render(<QuickCaptureFab />);
    expect(screen.getByTestId("quick-capture-fab")).toBeTruthy();
  });
});
