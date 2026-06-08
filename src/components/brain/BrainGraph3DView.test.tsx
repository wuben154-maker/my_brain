/**
 * @vitest-environment happy-dom
 */
import { createElement, forwardRef, useImperativeHandle } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGraphStore } from "@/stores/graphStore";

type ForceGraph3DProps = {
  onNodeHover?: (node: { id: string } | null) => void;
  onLinkHover?: (link: { id: string; relationType: string } | null) => void;
};

let lastForceGraph3DProps: ForceGraph3DProps | undefined;

function MockForceGraph3D(
  props: ForceGraph3DProps,
  ref: React.Ref<{
    d3Force: (name: string) => { distance: (value: number) => void };
    d3ReheatSimulation: () => void;
    zoomToFit: () => void;
    cameraPosition: () => void;
  }>,
) {
  lastForceGraph3DProps = props;
  useImperativeHandle(ref, () => ({
    d3Force: () => ({
      distance: () => undefined,
    }),
    d3ReheatSimulation: () => undefined,
    zoomToFit: () => undefined,
    cameraPosition: () => undefined,
  }));
  return <div data-testid="force-graph-3d-mock" />;
}

vi.mock("react-force-graph-3d", () => ({
  default: forwardRef(MockForceGraph3D),
}));

import { BrainGraph3DView } from "@/components/brain/BrainGraph3DView";

describe("BrainGraph3DView (G1)", () => {
  afterEach(() => {
    cleanup();
    lastForceGraph3DProps = undefined;
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

describe("BrainGraph3DView (V6 hover parity)", () => {
  afterEach(() => {
    cleanup();
    lastForceGraph3DProps = undefined;
    useGraphStore.setState({
      nodes: [],
      edges: [],
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      selectedNodeId: null,
    });
  });

  it("shows NodeHoverCard with concept intro on node hover", () => {
    useGraphStore.setState({
      nodes: [
        {
          id: "n1",
          title: "RAG",
          intro: "检索增强生成简介",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [],
    });

    render(createElement(BrainGraph3DView));
    expect(lastForceGraph3DProps?.onNodeHover).toBeTypeOf("function");

    act(() => {
      lastForceGraph3DProps?.onNodeHover?.({ id: "n1" });
    });

    const card = screen.getByTestId("node-hover-card");
    expect(card.textContent).toContain("RAG");
    expect(card.textContent).toContain("检索增强生成简介");
    expect(screen.queryByTestId("edge-hover-label")).toBeNull();
  });

  it("shows EdgeHoverLabel with relation label on link hover", () => {
    useGraphStore.setState({
      nodes: [
        {
          id: "n1",
          title: "RAG",
          intro: "简介",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "n2",
          title: "向量库",
          intro: "简介",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [
        {
          id: "e1",
          sourceId: "n1",
          targetId: "n2",
          relationType: "depends_on",
        },
      ],
    });

    render(createElement(BrainGraph3DView));
    expect(lastForceGraph3DProps?.onLinkHover).toBeTypeOf("function");

    act(() => {
      lastForceGraph3DProps?.onLinkHover?.({
        id: "e1",
        relationType: "depends_on",
      });
    });

    const label = screen.getByTestId("edge-hover-label");
    expect(label.textContent).toBe("影响关系");
    expect(screen.queryByTestId("node-hover-card")).toBeNull();
  });

  it("clears node hover card when link hover takes over", () => {
    useGraphStore.setState({
      nodes: [
        {
          id: "n1",
          title: "RAG",
          intro: "简介",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      edges: [
        {
          id: "e1",
          sourceId: "n1",
          targetId: "n1",
          relationType: "related",
        },
      ],
    });

    render(createElement(BrainGraph3DView));

    act(() => {
      lastForceGraph3DProps?.onNodeHover?.({ id: "n1" });
    });
    expect(screen.getByTestId("node-hover-card")).toBeTruthy();

    act(() => {
      lastForceGraph3DProps?.onLinkHover?.({
        id: "e1",
        relationType: "related",
      });
    });
    expect(screen.queryByTestId("node-hover-card")).toBeNull();
    expect(screen.getByTestId("edge-hover-label")).toBeTruthy();
  });
});
