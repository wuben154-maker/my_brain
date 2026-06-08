/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useGraphStore } from "@/stores/graphStore";

vi.mock("react-force-graph-2d", () => ({
  default: () => createElement("div", { "data-testid": "force-graph-2d-mock" }),
}));

vi.mock("@/lib/visualSnapshotMode", () => ({
  readVisualSnapshotId: () => "companion",
}));

import { BrainGraphView } from "@/components/brain/BrainGraphView";

describe("BrainGraphView (V6)", () => {
  afterEach(() => {
    cleanup();
    useGraphStore.setState({
      nodes: [],
      edges: [],
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      selectedNodeId: null,
    });
  });

  it("renders shell and reflects highlight state", () => {
    useGraphStore.setState({
      nodes: [
        {
          id: "n1",
          title: "测试概念",
          intro: "简介",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      edges: [],
      highlightedNodeIds: ["n1"],
      highlightedEdgeIds: [],
    });

    render(createElement(BrainGraphView));
    expect(screen.getByTestId("brain-graph-view")).toBeTruthy();
    expect(screen.getByTestId("force-graph-2d-mock")).toBeTruthy();
    expect(useGraphStore.getState().highlightedNodeIds).toEqual(["n1"]);
  });

  it("hides graph HUD chrome in companion minimal mode", () => {
    useGraphStore.setState({
      nodes: [
        {
          id: "n1",
          title: "测试概念",
          intro: "简介",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      edges: [],
    });

    render(createElement(BrainGraphView));
    expect(screen.queryByLabelText("图谱缩放控件")).toBeNull();
    expect(screen.queryByLabelText("图谱深度")).toBeNull();
    expect(screen.queryByText("图谱统计")).toBeNull();
  });
});
