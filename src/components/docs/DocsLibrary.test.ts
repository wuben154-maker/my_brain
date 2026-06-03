/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocsLibrary } from "@/components/docs/DocsLibrary";
import { useGraphStore } from "@/stores/graphStore";
import { useUiStore } from "@/stores/uiStore";

describe("DocsLibrary (N2)", () => {
  beforeEach(() => {
    useUiStore.setState({ activeSection: "docs" });
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
    vi.restoreAllMocks();
  });

  it("shows empty state when no sourced concepts", () => {
    render(createElement(DocsLibrary));
    expect(screen.getByTestId("docs-library-empty")).toBeTruthy();
  });

  it("lists domain groups and focuses node on graph", () => {
    useGraphStore.setState({
      nodes: [
        {
          id: "node-rag",
          title: "RAG",
          intro: "检索增强",
          sourceUrl: "https://example.com/rag",
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z",
        },
      ],
      edges: [],
      previewGhostNodes: [],
      previewGhostEdges: [],
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      selectedNodeId: null,
    });

    render(createElement(DocsLibrary));
    expect(screen.getByTestId("docs-domain-example.com")).toBeTruthy();
    fireEvent.click(screen.getByTestId("docs-focus-graph-node-rag"));

    expect(useUiStore.getState().activeSection).toBe("graph");
    expect(useGraphStore.getState().selectedNodeId).toBe("node-rag");
  });

  it("opens source URL in a new tab", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    useGraphStore.setState({
      nodes: [
        {
          id: "node-src",
          title: "Source",
          intro: "i",
          sourceUrl: "https://github.com/acme/repo",
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      edges: [],
      previewGhostNodes: [],
      previewGhostEdges: [],
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      selectedNodeId: null,
    });

    render(createElement(DocsLibrary));
    fireEvent.click(screen.getByTestId("docs-open-source-node-src"));

    expect(openSpy).toHaveBeenCalledWith(
      "https://github.com/acme/repo",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
