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
      value,
      onChangeText,
      multiline,
      accessibilityLabel,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      disabled?: boolean;
      value?: string;
      onChangeText?: (v: string) => void;
      multiline?: boolean;
      accessibilityLabel?: string;
    }) {
      if (onChangeText !== undefined) {
        return React.createElement("textarea", {
          "data-testid": testID,
          value,
          onChange: (e: { target: { value: string } }) => onChangeText(e.target.value),
          "aria-label": accessibilityLabel,
        });
      }
      return React.createElement(
        onPress ? "button" : "div",
        {
          "data-testid": testID,
          onClick: disabled ? undefined : onPress,
          disabled,
          "aria-label": accessibilityLabel,
        },
        children,
      );
    };
  return {
    View: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) =>
      React.createElement(
        "div",
        {
          "data-testid": testID,
          onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
        },
        children,
      ),
    Text: RN("span"),
    Pressable: RN("button"),
    TextInput: RN("textarea"),
    ScrollView: RN("div"),
    Modal: ({ children, visible }: { children?: React.ReactNode; visible?: boolean }) =>
      visible ? React.createElement("div", { "data-testid": "modal" }, children) : null,
    StyleSheet: { create: (s: object) => s },
  };
});

vi.mock("./ui/GlassCard", () => ({
  GlassCard: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
    React.createElement("div", { "data-testid": testID }, children),
}));

import { ActionPreviewSheet } from "./ActionPreviewSheet";
import { buildActionDraft } from "@my-brain/core";

describe("ActionPreviewSheet", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders editable title and body for draft preview", () => {
    const draft = buildActionDraft("draft_weekly_review", {
      title: "周报",
      summary: "本周学习了 Graph RAG",
    });

    render(
      <ActionPreviewSheet
        visible
        draft={draft}
        canRemoteExecute={false}
        onSaveDraft={() => undefined}
        onProceedRemote={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(screen.getByTestId("action-preview-sheet-title-input")).toBeTruthy();
    expect(screen.getByTestId("action-preview-sheet-body-input")).toBeTruthy();
    expect(screen.getByTestId("action-preview-sheet-primary").textContent).toBe("保存草稿");
  });

  it("disables remote primary when execution API unavailable", () => {
    const draft = buildActionDraft("draft_github_issue", { title: "Issue" });

    render(
      <ActionPreviewSheet
        visible
        draft={draft}
        canRemoteExecute={false}
        remoteExecuteDisabledReason="Execution API 已关闭（默认）"
        onSaveDraft={() => undefined}
        onProceedRemote={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(
      (screen.getByTestId("action-preview-sheet-primary") as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByTestId("action-preview-sheet-remote-disabled").textContent).toContain(
      "Execution API 已关闭",
    );
  });

  it("calls onProceedRemote for remote-write draft types", () => {
    const draft = buildActionDraft("draft_github_issue", { title: "Issue" });
    const onProceedRemote = vi.fn();

    render(
      <ActionPreviewSheet
        visible
        draft={draft}
        canRemoteExecute
        onSaveDraft={() => undefined}
        onProceedRemote={onProceedRemote}
        onCancel={() => undefined}
      />,
    );

    fireEvent.click(screen.getByTestId("action-preview-sheet-primary"));
    expect(onProceedRemote).toHaveBeenCalledTimes(1);
  });
});
