import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { useGraphStore } from "@/stores/graphStore";

describe("BrainGraphView (V6)", () => {
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

    render(<BrainGraphView />);
    expect(screen.getByTestId("brain-graph-view")).toBeTruthy();
    expect(useGraphStore.getState().highlightedNodeIds).toEqual(["n1"]);
  });
});
