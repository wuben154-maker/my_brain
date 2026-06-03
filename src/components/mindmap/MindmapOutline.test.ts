/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MindmapOutline } from "@/components/mindmap/MindmapOutline";
import { useGraphStore } from "@/stores/graphStore";
import { useUiStore } from "@/stores/uiStore";

describe("MindmapOutline (N3)", () => {
  beforeEach(() => {
    useUiStore.setState({ activeSection: "mindmap" });
    useGraphStore.setState({
      nodes: [],
      edges: [],
      previewGhostNodes: [],
      previewGhostEdges: [],
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      selectedNodeId: null,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows empty state when graph has no active nodes", () => {
    render(createElement(MindmapOutline));
    expect(screen.getByTestId("mindmap-outline-empty")).toBeTruthy();
  });

  it("collapses branch and focuses node on graph", () => {
    useGraphStore.setState({
      nodes: [
        {
          id: "hub",
          title: "枢纽",
          intro: "中心概念",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
        },
        {
          id: "leaf",
          title: "叶子",
          intro: "",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
        },
      ],
      edges: [
        {
          id: "e1",
          sourceId: "hub",
          targetId: "leaf",
          relationType: "related",
        },
      ],
      previewGhostNodes: [],
      previewGhostEdges: [],
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      selectedNodeId: null,
    });

    render(createElement(MindmapOutline));
    expect(screen.getByTestId("mindmap-node-leaf")).toBeTruthy();

    fireEvent.click(screen.getByTestId("mindmap-toggle-hub"));
    expect(screen.queryByTestId("mindmap-node-leaf")).toBeNull();

    fireEvent.click(screen.getByTestId("mindmap-focus-graph-hub"));
    expect(useUiStore.getState().activeSection).toBe("graph");
    expect(useGraphStore.getState().selectedNodeId).toBe("hub");
  });
});
