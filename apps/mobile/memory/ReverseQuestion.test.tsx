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
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) {
      return React.createElement(tag, { "data-testid": testID }, children);
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    StyleSheet: { create: (s: object) => s, hairlineWidth: 1 },
  };
});

import type { ReverseQuestionResult } from "@my-brain/core";
import { ReverseQuestion } from "./ReverseQuestion";

const question: ReverseQuestionResult = {
  visible: true,
  outputKind: "deepen_concept",
  prompt: "你还想深聊哪个概念？先从「Rust 所有权」开始？",
  evidenceRefs: ["node:node-1"],
  nodeIds: ["node-1"],
};

describe("ReverseQuestion component", () => {
  it("renders mode-specific prompt with graph binding", () => {
    render(<ReverseQuestion question={question} />);
    expect(screen.getByTestId("reverse-question-prompt").textContent).toContain("Rust");
    expect(screen.getByTestId("reverse-question-evidence").textContent).toContain("node:node-1");
  });

  it("shows empty state inside card when graph empty", () => {
    render(
      <ReverseQuestion
        question={{
          visible: false,
          outputKind: "recall_day",
          prompt: "",
          evidenceRefs: [],
          nodeIds: [],
        }}
      />,
    );
    expect(screen.getByTestId("reverse-question-empty")).toBeTruthy();
  });
});
