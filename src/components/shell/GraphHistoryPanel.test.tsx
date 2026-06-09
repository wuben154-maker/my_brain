/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GraphHistoryPanel } from "@/components/shell/GraphHistoryPanel";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";

const nodeA = {
  id: "n-a",
  title: "A",
  intro: "a",
  sourceUrl: null,
  archived: false,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const linkEntry: GraphHistoryEntry = {
  id: "hist-link-1",
  at: "2026-06-02T00:00:00.000Z",
  kind: "link",
  summary: "自动连边 A → B",
  reasonCode: "ingest_link",
  reasonDetail: "相关概念",
  affectedNodeIds: ["n-a", "n-b"],
  before: { nodes: [nodeA], edges: [] },
  after: {
    nodes: [nodeA],
    edges: [
      {
        id: "e-new",
        sourceId: "n-a",
        targetId: "n-b",
        relationType: "related",
      },
    ],
  },
};

const undoneEntry: GraphHistoryEntry = {
  ...linkEntry,
  id: "hist-link-2",
  at: "2026-06-01T00:00:00.000Z",
  summary: "较早的整理",
  undone: true,
};

describe("graphHistoryPanel", () => {
  beforeEach(() => {
    useGraphHistoryStore.setState({
      entries: [linkEntry, undoneEntry],
      loaded: true,
      reportEntryId: null,
      historyPanelOpen: true,
      persistWarning: false,
      lastUndoError: null,
      load: vi.fn(),
      record: vi.fn(),
      undo: vi.fn(),
      openReport: vi.fn(),
      dismissReport: vi.fn(),
      setHistoryPanelOpen: vi.fn(),
      clearUndoError: vi.fn(),
      clear: useGraphHistoryStore.getState().clear,
    });
  });

  afterEach(() => {
    cleanup();
    useGraphHistoryStore.getState().clear();
  });

  it("lists entries newest-first with kind and undone state", () => {
    render(createElement(GraphHistoryPanel));
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(
      screen.getByTestId(`graph-history-item-${linkEntry.id}`),
    ).toBeTruthy();
    expect(
      screen.getByTestId(`graph-history-undone-${undoneEntry.id}`),
    ).toBeTruthy();
    expect(screen.getByTestId(`graph-history-kind-${linkEntry.id}`).textContent).toBe(
      "连边",
    );
  });

  it("expands diff summary for a selected entry", () => {
    render(createElement(GraphHistoryPanel));
    const row = screen.getByTestId(`graph-history-item-${linkEntry.id}`);
    fireEvent.click(row.querySelector("button")!);
    const diff = screen.getByTestId(`graph-history-diff-${linkEntry.id}`);
    expect(diff.textContent).toContain("新增边：e-new");
  });

  it("hides panel root when there are no entries", () => {
    useGraphHistoryStore.setState({ entries: [] });
    render(createElement(GraphHistoryPanel));
    expect(screen.queryByTestId("graph-history-panel-root")).toBeNull();
  });
});
