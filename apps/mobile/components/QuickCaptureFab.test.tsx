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
      placeholder,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      placeholder?: string;
    }) {
      return React.createElement(
        tag,
        { "data-testid": testID, onClick: onPress, placeholder },
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
import { ThemeProvider } from "../theme/ThemeProvider";

describe("QuickCaptureFab", () => {
  it("renders capture entry", () => {
    useProvisionalStore.setState({ candidates: [] });
    render(
      <ThemeProvider mode="dark">
        <QuickCaptureFab />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("quick-capture-fab")).toBeTruthy();
  });

  it("shows product copy in capture sheet and gates dev fixture to __DEV__", () => {
    useProvisionalStore.setState({ candidates: [] });
    render(
      <ThemeProvider mode="dark">
        <QuickCaptureFab open />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("quick-capture-link-input").getAttribute("placeholder")).toBe(
      "粘贴网页链接",
    );
    expect(screen.getByTestId("quick-capture-link-submit").textContent).toBe("添加链接");
    expect(screen.getByText("加入待点亮星尘")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/SSRF|mock guard/i);

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      expect(screen.getByTestId("quick-capture-dev-fixture")).toBeTruthy();
    } else {
      expect(screen.queryByTestId("quick-capture-dev-fixture")).toBeNull();
    }
  });
});
