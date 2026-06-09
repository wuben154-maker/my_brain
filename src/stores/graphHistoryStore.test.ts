import { beforeEach, describe, expect, it } from "vitest";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import { applyGraphMutation, persistGraphSnapshot } from "@/lib/graphMutations";
import { runAutoCurateAfterIngest } from "@/lib/runAutoCuratePipeline";
import { createTempStorage, reopenStorage } from "@/invariants/testStorage";
import { bootstrapShowcaseGraph } from "@/showcase/showcaseDemoMode";
import {
  buildShowcaseIngestCreateProposal,
  SHOWCASE_AUTO_CURATE_GOLDEN,
  SHOWCASE_PROFILE,
} from "@/showcase/showcaseFixtures";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";

const showcaseEnv = () => {
  process.env.VITE_SHOWCASE_DEMO = "1";
};
const clearShowcaseEnv = () => {
  delete process.env.VITE_SHOWCASE_DEMO;
};

const node = {
  id: "n1",
  title: "RAG",
  intro: "intro",
  sourceUrl: null,
  archived: false,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const beforeSnapshot = { nodes: [node], edges: [] };
const afterSnapshot = {
  nodes: [{ ...node, archived: true }],
  edges: [],
};

const entry: GraphHistoryEntry = {
  id: "hist-1",
  at: "2026-06-01T00:00:00.000Z",
  kind: "archive",
  summary: "auto archive",
  reasonCode: "stale",
  reasonDetail: "超过 90 天未更新",
  affectedNodeIds: ["n1"],
  before: beforeSnapshot,
  after: afterSnapshot,
};

describe("graphHistoryStore", () => {
  beforeEach(() => {
    useGraphHistoryStore.getState().clear();
  });

  it("records and loads entries from storage", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await useGraphHistoryStore.getState().record(storage, entry);
      useGraphHistoryStore.getState().clear();
      await useGraphHistoryStore.getState().load(storage);
      expect(useGraphHistoryStore.getState().entries[0]?.id).toBe(entry.id);
      const rows = await storage.listGraphHistory();
      expect(rows.some((row) => row.id === entry.id)).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("round-trips provenance fields through storage", async () => {
    const { storage, dbPath, kind, cleanup } = createTempStorage();
    try {
      await storage.init();
      await storage.saveGraphHistoryEntry(entry);
      await storage.close();

      const reopened = reopenStorage(dbPath, kind);
      await reopened.init();
      const row = (await reopened.listGraphHistory()).find((r) => r.id === entry.id);
      expect(row).toMatchObject({
        reasonCode: "stale",
        reasonDetail: "超过 90 天未更新",
        affectedNodeIds: ["n1"],
      });
      await reopened.close();
    } finally {
      cleanup();
    }
  });

  it("undo removes later edges but preserves concepts created after the history entry", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const n2 = {
        id: "n2",
        title: "Later concept",
        intro: "added after history",
        sourceUrl: null,
        archived: false,
        createdAt: "2026-06-02T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
      };
      const linkEntry: GraphHistoryEntry = {
        id: "hist-link",
        at: "2026-06-01T12:00:00.000Z",
        kind: "link",
        summary: "auto link",
        reasonCode: "overlap_title",
        reasonDetail: "标题重叠",
        affectedNodeIds: ["n1", "n2"],
        before: beforeSnapshot,
        after: {
          nodes: [node],
          edges: [
            {
              id: "e-later",
              sourceId: "n1",
              targetId: "n2",
              relationType: "related",
            },
          ],
        },
      };

      await storage.saveConcept(node);
      await useGraphHistoryStore.getState().record(storage, linkEntry);
      await storage.saveConcept(n2);
      await storage.saveEdge({
        id: "e-after-history",
        sourceId: "n1",
        targetId: "n2",
        relationType: "related",
      });

      const restored = await useGraphHistoryStore
        .getState()
        .undo(storage, linkEntry.id);

      expect(restored).toBeTruthy();
      expect(restored!.nodes.map((row) => row.id).sort()).toEqual(["n1", "n2"]);
      expect(restored!.edges.map((row) => row.id)).toEqual(["e-after-history"]);
      const graph = await storage.loadGraph();
      expect(graph.nodes.map((row) => row.id).sort()).toEqual(["n1", "n2"]);
      expect(graph.edges.map((row) => row.id)).toEqual(["e-after-history"]);
      const display = await storage.loadGraphForDisplay();
      expect(display.nodes.map((row) => row.id).sort()).toEqual(["n1", "n2"]);
      expect(display.edges.map((row) => row.id)).toEqual(["e-after-history"]);
    } finally {
      cleanup();
    }
  });

  it("record opens report overlay entry id", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await useGraphHistoryStore.getState().record(storage, entry);
      expect(useGraphHistoryStore.getState().reportEntryId).toBe(entry.id);
    } finally {
      cleanup();
    }
  });

  it("undo returns null and sets error when entry is missing", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const result = await useGraphHistoryStore
        .getState()
        .undo(storage, "missing-id");
      expect(result).toBeNull();
      expect(useGraphHistoryStore.getState().lastUndoError).toBe("记录不存在");
    } finally {
      cleanup();
    }
  });

  it("showcase golden link undo removes edge but keeps ingest node", async () => {
    showcaseEnv();
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await bootstrapShowcaseGraph(storage);
      const ingestProposal = buildShowcaseIngestCreateProposal();
      const beforeIngest = await storage.loadGraphForDisplay();
      const afterIngest = applyGraphMutation(beforeIngest, ingestProposal);
      await persistGraphSnapshot(storage, beforeIngest, afterIngest);

      const recorded = await runAutoCurateAfterIngest(
        SHOWCASE_AUTO_CURATE_GOLDEN.sourceId,
        { storage, profile: SHOWCASE_PROFILE },
      );
      expect(recorded).toHaveLength(1);
      const linkEntry = recorded[0]!;

      const restored = await useGraphHistoryStore
        .getState()
        .undo(storage, linkEntry.id);

      expect(restored).toBeTruthy();
      const graphAfter = await storage.loadGraph();
      expect(
        graphAfter.edges.some(
          (edge) =>
            edge.sourceId === SHOWCASE_AUTO_CURATE_GOLDEN.sourceId &&
            edge.targetId === SHOWCASE_AUTO_CURATE_GOLDEN.targetId,
        ),
      ).toBe(false);
      expect(
        graphAfter.nodes.some(
          (node) => node.id === SHOWCASE_AUTO_CURATE_GOLDEN.sourceId,
        ),
      ).toBe(true);
      expect(
        useGraphHistoryStore
          .getState()
          .entries.find((row) => row.id === linkEntry.id)?.undone,
      ).toBe(true);
    } finally {
      clearShowcaseEnv();
      cleanup();
    }
  });

  it("undo restores before snapshot and marks entry undone", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await storage.saveConcept({ ...node, archived: true });
      await useGraphHistoryStore.getState().record(storage, entry);
      const restored = await useGraphHistoryStore
        .getState()
        .undo(storage, entry.id);
      expect(restored?.nodes[0]?.archived).toBe(false);
      expect(restored?.edges).toEqual([]);
      expect((await storage.loadGraph()).nodes[0]?.archived).toBe(false);
      const rows = await storage.listGraphHistory();
      const row = rows.find((r) => r.id === entry.id);
      expect(row?.undone).toBe(true);
    } finally {
      cleanup();
    }
  });
});
