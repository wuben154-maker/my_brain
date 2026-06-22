/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
      disabled,
      accessibilityState,
      accessibilityLabel,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      disabled?: boolean;
      accessibilityState?: { disabled?: boolean; checked?: boolean };
      accessibilityLabel?: string;
    }) {
      return React.createElement(
        onPress ? "button" : tag,
        {
          "data-testid": testID,
          onClick: disabled ? undefined : onPress,
          disabled,
          "aria-disabled": accessibilityState?.disabled ?? disabled,
          "aria-checked": accessibilityState?.checked,
          "aria-label": accessibilityLabel,
        },
        children,
      );
    };
  return {
    View: ({
      children,
      testID,
      onClick,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onClick?: (e: { stopPropagation: () => void }) => void;
    }) =>
      React.createElement(
        "div",
        {
          "data-testid": testID,
          onClick: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            onClick?.(e);
          },
        },
        children,
      ),
    Text: RN("span"),
    Pressable: RN("button"),
    Modal: ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) =>
      visible ? React.createElement("div", { "data-testid": "modal" }, children) : null,
    StyleSheet: { create: (s: object) => s },
  };
});

vi.mock("./ui/GlassCard", () => ({
  GlassCard: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement("div", { "data-testid": testID }, children),
}));

import { ActionConfirmationSheet } from "./ActionConfirmationSheet";
import { buildActionDraft } from "@my-brain/core";

describe("ActionConfirmationSheet", () => {
  afterEach(() => {
    cleanup();
  });

  it("disables confirm button until checkbox checked", () => {
    const onConfirm = vi.fn();
    const draft = buildActionDraft("draft_github_issue", { title: "测试 issue" });

    render(
      <ActionConfirmationSheet
        visible
        draft={draft}
        onConfirm={onConfirm}
        onCancel={() => undefined}
      />,
    );

    const confirmBtn = screen.getByTestId("action-confirmation-sheet-confirm") as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    fireEvent.click(screen.getByTestId("action-confirmation-sheet-checkbox-row"));
    expect((screen.getByTestId("action-confirmation-sheet-confirm") as HTMLButtonElement).disabled).toBe(
      false,
    );

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows external write summary for github issue draft", () => {
    const draft = buildActionDraft("draft_github_issue", {
      title: "Fix merge",
      repoHint: "my_brain",
    });

    render(
      <ActionConfirmationSheet
        visible
        draft={draft}
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("action-confirmation-sheet-summary").textContent).toContain(
      "GitHub issue",
    );
    expect(screen.getByTestId("action-confirmation-sheet-summary").textContent).toContain("Fix merge");
  });
});
