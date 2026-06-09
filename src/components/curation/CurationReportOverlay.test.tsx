/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CurationReportOverlay } from "@/components/curation/CurationReportOverlay";
import { SHOWCASE_AUTO_CURATE_GOLDEN } from "@/showcase/showcaseFixtures";
import { useAppStore } from "@/stores/appStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import type { GraphHistoryEntry } from "@/domain/graphHistory";

const goldenEntry: GraphHistoryEntry = {
  id: "auto-link-showcase-ingest-graphiti-demo-agent",
  at: "2026-06-01T00:00:00.000Z",
  kind: "link",
  summary: SHOWCASE_AUTO_CURATE_GOLDEN.summary,
  reasonCode: SHOWCASE_AUTO_CURATE_GOLDEN.reasonCode,
  reasonDetail: SHOWCASE_AUTO_CURATE_GOLDEN.reasonDetail,
  affectedNodeIds: [
    SHOWCASE_AUTO_CURATE_GOLDEN.sourceId,
    SHOWCASE_AUTO_CURATE_GOLDEN.targetId,
  ],
  before: { nodes: [], edges: [] },
  after: { nodes: [], edges: [] },
};

describe("curationReportOverlay", () => {
  const undo = vi.fn(async () => ({ nodes: [], edges: [] }));
  const dismissReport = vi.fn();

  beforeEach(() => {
    useGraphHistoryStore.setState({
      entries: [goldenEntry],
      loaded: true,
      reportEntryId: goldenEntry.id,
      historyPanelOpen: false,
      persistWarning: false,
      lastUndoError: null,
      load: vi.fn(),
      record: vi.fn(),
      undo,
      openReport: vi.fn(),
      dismissReport,
      setHistoryPanelOpen: vi.fn(),
      clearUndoError: vi.fn(),
      clear: useGraphHistoryStore.getState().clear,
    });
    useAppStore.setState({
      storage: {} as ReturnType<typeof useAppStore.getState>["storage"],
    });
    undo.mockClear();
    dismissReport.mockClear();
  });

  afterEach(() => {
    cleanup();
    useGraphHistoryStore.getState().clear();
  });

  it("renders golden reason fields when report entry is open", () => {
    render(createElement(CurationReportOverlay));
    expect(screen.getByTestId("curation-report-overlay")).toBeTruthy();
    expect(screen.getByText(SHOWCASE_AUTO_CURATE_GOLDEN.summary)).toBeTruthy();
    expect(screen.getByTestId("curation-report-kind").textContent).toBe("连边");
    expect(screen.getByTestId("curation-report-reason-code").textContent).toBe(
      SHOWCASE_AUTO_CURATE_GOLDEN.reasonCode,
    );
    expect(screen.getByTestId("curation-report-reason-detail").textContent).toBe(
      SHOWCASE_AUTO_CURATE_GOLDEN.reasonDetail,
    );
    expect(
      screen.getByTestId("curation-report-affected-nodes").textContent,
    ).toContain(SHOWCASE_AUTO_CURATE_GOLDEN.sourceId);
  });

  it("calls undo with entry id when 撤销这次整理 is clicked", () => {
    render(createElement(CurationReportOverlay));
    fireEvent.click(screen.getByTestId("curation-report-undo"));
    expect(undo).toHaveBeenCalledWith(
      useAppStore.getState().storage,
      goldenEntry.id,
    );
  });

  it("dismisses overlay on close", () => {
    render(createElement(CurationReportOverlay));
    fireEvent.click(screen.getByTestId("curation-report-close"));
    expect(dismissReport).toHaveBeenCalled();
  });

  it("does not render when no report entry is active", () => {
    useGraphHistoryStore.setState({ reportEntryId: null });
    render(createElement(CurationReportOverlay));
    expect(screen.queryByTestId("curation-report-overlay")).toBeNull();
  });

  it("shows persist warning when history entry was not saved", () => {
    useGraphHistoryStore.setState({ persistWarning: true });
    render(createElement(CurationReportOverlay));
    expect(screen.getByTestId("curation-report-persist-warning").textContent).toContain(
      "变更未持久化",
    );
  });

  it("renders edge migration summary when entry includes migrations", () => {
    const migrationEntry: GraphHistoryEntry = {
      id: "hist-edge-migrate",
      at: "2026-06-01T00:00:00.000Z",
      kind: "archive",
      summary: "归档并迁移关系",
      reasonCode: "stale",
      reasonDetail: "合并到主概念",
      affectedNodeIds: ["drop-node", "keep-node"],
      before: {
        nodes: [
          {
            id: "drop-node",
            title: "旧概念",
            intro: "drop",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
          {
            id: "keep-node",
            title: "保留概念",
            intro: "keep",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
        ],
        edges: [
          {
            id: "e-before",
            sourceId: "drop-node",
            targetId: "peer-node",
            relationType: "related",
          },
        ],
      },
      after: {
        nodes: [
          {
            id: "drop-node",
            title: "旧概念",
            intro: "drop",
            sourceUrl: null,
            archived: true,
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-02T00:00:00.000Z",
          },
          {
            id: "keep-node",
            title: "保留概念",
            intro: "keep",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
        ],
        edges: [
          {
            id: "e-after",
            sourceId: "keep-node",
            targetId: "peer-node",
            relationType: "related",
          },
        ],
      },
      edgeMigrations: [
        {
          edgeId: "e-after",
          fromNodeId: "drop-node",
          toNodeId: "keep-node",
        },
      ],
    };

    useGraphHistoryStore.setState({
      entries: [migrationEntry],
      reportEntryId: migrationEntry.id,
    });

    render(createElement(CurationReportOverlay));
    expect(screen.getByTestId("curation-report-edge-migrations")).toBeTruthy();
    const migrationLine = screen.getByTestId("curation-report-edge-migrations");
    expect(migrationLine.textContent).toContain("关系已迁移");
    expect(migrationLine.textContent).toContain("保留概念");
  });
});
