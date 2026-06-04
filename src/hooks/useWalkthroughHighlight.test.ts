/**
 * @vitest-environment happy-dom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GraphEdge } from "@/domain/graph";
import { useWalkthroughHighlight } from "@/hooks/useWalkthroughHighlight";
import { useGraphStore } from "@/stores/graphStore";

const edges: GraphEdge[] = [
  {
    id: "e-ab",
    sourceId: "a",
    targetId: "b",
    relationType: "related",
  },
  {
    id: "e-bc",
    sourceId: "b",
    targetId: "c",
    relationType: "depends_on",
  },
];

describe("useWalkthroughHighlight (V6)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGraphStore.setState({
      nodes: [],
      edges,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      selectedNodeId: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("steps through N node ids on fake timers", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() =>
      useWalkthroughHighlight(["a", "b", "c"], 800, { onStep }),
    );

    act(() => {
      result.current.start();
    });

    expect(useGraphStore.getState().highlightedNodeIds).toEqual(["a"]);
    expect(result.current.stepIndex).toBe(0);

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(useGraphStore.getState().highlightedNodeIds).toEqual(["b"]);
    expect(useGraphStore.getState().highlightedEdgeIds).toEqual(["e-ab"]);
    expect(onStep).toHaveBeenCalledWith("b");

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(useGraphStore.getState().highlightedNodeIds).toEqual(["c"]);
    expect(useGraphStore.getState().highlightedEdgeIds).toEqual(["e-bc"]);

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(useGraphStore.getState().highlightedNodeIds).toEqual([]);
    expect(useGraphStore.getState().highlightedEdgeIds).toEqual([]);
    expect(result.current.activeNodeId).toBeNull();
    expect(onStep).toHaveBeenCalledTimes(3);
  });

  it("stop clears highlights immediately", () => {
    const { result } = renderHook(() =>
      useWalkthroughHighlight(["a", "b"], 500),
    );

    act(() => {
      result.current.start();
    });
    expect(useGraphStore.getState().highlightedNodeIds).toEqual(["a"]);

    act(() => {
      result.current.stop();
    });
    expect(useGraphStore.getState().highlightedNodeIds).toEqual([]);
    expect(useGraphStore.getState().highlightedEdgeIds).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(useGraphStore.getState().highlightedNodeIds).toEqual([]);
  });

  it("start accepts override node ids", () => {
    const { result } = renderHook(() =>
      useWalkthroughHighlight([], 400),
    );

    act(() => {
      result.current.start(["x", "y"]);
    });
    expect(useGraphStore.getState().highlightedNodeIds).toEqual(["x"]);
  });
});
