/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
    StyleSheet: { create: (s: object) => s },
  };
});

import type { GraphNode } from "@my-brain/core";

import { ConceptSoulCard } from "./ConceptSoulCard";

const sampleNode: GraphNode = {
  id: "node-1",
  concept: "Realtime API",
  intro: "语音打断原生支持",
  sourceLinks: ["https://example.com/realtime"],
  archived: false,
  createdAt: "2026-06-15T08:00:00Z",
};

describe("ConceptSoulCard M5 deepen", () => {
  it("renders concept evidence when a focal node is provided", () => {
    render(
      <ConceptSoulCard
        node={sampleNode}
        evidenceRefs={["node:node-1", "graph_change:chg-1"]}
      />,
    );
    expect(screen.getByTestId("concept-soul-card")).toBeTruthy();
    expect(screen.getByText("Realtime API")).toBeTruthy();
    expect(screen.getByText(/语音打断原生支持/)).toBeTruthy();
    expect(screen.getByTestId("concept-soul-evidence-count").textContent).toContain("2");
  });

  it("hides when no focal node is available", () => {
    render(<ConceptSoulCard node={null} evidenceRefs={[]} />);
    cleanup();
    expect(screen.queryByTestId("concept-soul-card")).toBeNull();
  });
});
