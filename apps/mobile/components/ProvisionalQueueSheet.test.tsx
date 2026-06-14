/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
} from "@my-brain/core";

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

import { ProvisionalQueueSheet } from "./ProvisionalQueueSheet";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";

describe("ProvisionalQueueSheet", () => {
  beforeEach(() => {
    useMobileAppStore.setState({
      queueSheetOpen: true,
      graph: new InMemoryGraphRepository(),
      history: new InMemoryHistoryRepository(),
    });
    useProvisionalStore.setState({ candidates: [], lastExplanation: null });
  });

  it("lists pending candidates", () => {
    const c = useProvisionalStore.getState().addTextCapture("测试候选");
    render(<ProvisionalQueueSheet />);
    expect(screen.getByTestId("provisional-queue-sheet")).toBeTruthy();
    expect(screen.getByTestId(`provisional-item-${c.id}`)).toBeTruthy();
  });
});
