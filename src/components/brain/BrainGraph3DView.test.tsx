/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGraphStore } from "@/stores/graphStore";

vi.mock("react-force-graph-3d", () => ({
  default: () => <div data-testid="force-graph-3d-mock" />,
}));

import { BrainGraph3DView } from "@/components/brain/BrainGraph3DView";

describe("BrainGraph3DView (G1)", () => {
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

  it("mounts without throwing when graph has nodes", () => {
    useGraphStore.setState({
      nodes: [
        {
          id: "n1",
          title: "RAG",
          intro: "检索增强",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [],
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      selectedNodeId: null,
    });

    render(createElement(BrainGraph3DView));
    expect(screen.getByTestId("brain-graph-3d")).toBeTruthy();
    expect(screen.getByTestId("force-graph-3d-mock")).toBeTruthy();
  });
});
