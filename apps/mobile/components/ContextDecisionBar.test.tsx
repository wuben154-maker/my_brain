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
      onClick,
      accessibilityLabel,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      onClick?: () => void;
      accessibilityLabel?: string;
    }) {
      return React.createElement(
        onPress ? "button" : tag,
        {
          "data-testid": testID,
          onClick: onPress ?? onClick,
          "aria-label": accessibilityLabel,
        },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    Modal: ({
      children,
      visible,
      accessibilityViewIsModal,
    }: {
      children?: React.ReactNode;
      visible?: boolean;
      accessibilityViewIsModal?: boolean;
    }) =>
      visible
        ? React.createElement(
            "div",
            { "data-testid": "context-decision-sheet-modal", "aria-modal": accessibilityViewIsModal },
            children,
          )
        : null,
    StyleSheet: { create: (s: object) => s },
  };
});

vi.mock("./ui/GlassCard", () => ({
  GlassCard: ({
    children,
    testID,
  }: {
    children?: React.ReactNode;
    testID?: string;
  }) => React.createElement("div", { "data-testid": testID }, children),
}));

import { ContextDecisionSheet } from "./ContextDecisionSheet";
import { ContextDecisionBar } from "./ui/ContextDecisionBar";

describe("ContextDecisionBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not mount bar when actions empty", () => {
    render(<ContextDecisionBar actions={[]} />);
    expect(screen.queryByTestId("context-decision-bar")).toBeNull();
  });

  it("uses default intent labels", () => {
    render(
      <ContextDecisionBar
        actions={[
          { key: "ingest", onPress: vi.fn() },
          { key: "skip", onPress: vi.fn() },
          { key: "detail", onPress: vi.fn() },
        ]}
      />,
    );
    expect(screen.getByTestId("context-decision-bar-ingest").textContent).toBe("记住这个");
    expect(screen.getByTestId("context-decision-bar-skip").textContent).toBe("先不用");
    expect(screen.getByTestId("context-decision-bar-detail").textContent).toBe("多说点");
  });

  it("uses today label variant", () => {
    render(
      <ContextDecisionBar
        labelVariant="today"
        actions={[
          { key: "ingest", onPress: vi.fn() },
          { key: "skip", onPress: vi.fn() },
          { key: "detail", onPress: vi.fn() },
        ]}
      />,
    );
    expect(screen.getByTestId("context-decision-bar-ingest").textContent).toBe("记住这条");
  });

  it("uses inbox label variant", () => {
    render(
      <ContextDecisionBar
        labelVariant="inbox"
        actions={[
          { key: "ingest", onPress: vi.fn() },
          { key: "skip", onPress: vi.fn() },
          { key: "detail", onPress: vi.fn() },
        ]}
      />,
    );
    expect(screen.getByTestId("context-decision-bar-ingest").textContent).toBe("点亮成星");
    expect(screen.getByTestId("context-decision-bar-detail").textContent).toBe("整理一下");
  });
});

describe("ContextDecisionSheet", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not render when visible is false", () => {
    render(
      <ContextDecisionSheet
        visible={false}
        title="Graphiti 的 episode 机制"
        whyRecommended="命中 3 个节点"
        onIngest={vi.fn()}
        onSkip={vi.fn()}
        onDetail={vi.fn()}
        onDismiss={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("context-decision-sheet")).toBeNull();
  });

  it("shows sheet copy when candidate present", () => {
    mockCandidate();
    expect(screen.getByText("点亮成星")).toBeTruthy();
    expect(screen.getByText(/确认前不会写入永久星图/)).toBeTruthy();
    expect(screen.getByText("语音同义词：记住 / 不要 / 讲细点")).toBeTruthy();
  });

  it("dismiss does not call onIngest", () => {
    const onIngest = vi.fn();
    const onDismiss = vi.fn();
    render(
      <ContextDecisionSheet
        visible
        title="测试候选"
        whyRecommended="演示推荐"
        onIngest={onIngest}
        onSkip={vi.fn()}
        onDetail={vi.fn()}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByTestId("context-decision-sheet-backdrop"));
    expect(onDismiss).toHaveBeenCalled();
    expect(onIngest).not.toHaveBeenCalled();
  });
});

function mockCandidate() {
  render(
    <ContextDecisionSheet
      visible
      title="Graphiti 的 episode 机制"
      sourceLabel="候选 · 分享链接"
      whyRecommended="命中 3 个节点：Provider 抽象、GraphChange、MemoryReplay"
      onIngest={vi.fn()}
      onSkip={vi.fn()}
      onDetail={vi.fn()}
      onDismiss={vi.fn()}
    />,
  );
}
