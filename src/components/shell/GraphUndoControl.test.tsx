/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import { GraphUndoControl } from "@/components/shell/GraphUndoControl";
import { useAppStore } from "@/stores/appStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";

const entry: GraphHistoryEntry = {
  id: "hist-undo-ui",
  at: "2026-06-01T00:00:00.000Z",
  kind: "link",
  summary: "test link",
  reasonCode: "overlap_title",
  reasonDetail: "标题重叠",
  affectedNodeIds: ["n1", "n2"],
  before: { nodes: [], edges: [] },
  after: { nodes: [], edges: [] },
};

describe("GraphUndoControl", () => {
  const undo = vi.fn(async () => ({ nodes: [], edges: [] }));

  beforeEach(() => {
    useGraphHistoryStore.setState({
      entries: [entry],
      loaded: true,
      load: vi.fn(),
      record: vi.fn(),
      undo,
      clear: useGraphHistoryStore.getState().clear,
    });
    useAppStore.setState({
      storage: {} as ReturnType<typeof useAppStore.getState>["storage"],
    });
    undo.mockClear();
  });

  afterEach(() => {
    cleanup();
    useGraphHistoryStore.getState().clear();
  });

  it("renders when an undoable entry exists and calls undo on activate", async () => {
    render(createElement(GraphUndoControl));
    const button = screen.getByTestId("graph-undo-control");
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(undo).toHaveBeenCalledWith(useAppStore.getState().storage, entry.id);
  });

  it("does not render when every entry is already undone", () => {
    useGraphHistoryStore.setState({
      entries: [{ ...entry, undone: true }],
      loaded: true,
    });
    render(createElement(GraphUndoControl));
    expect(screen.queryByTestId("graph-undo-control")).toBeNull();
  });
});
