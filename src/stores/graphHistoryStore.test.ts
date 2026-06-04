import { beforeEach, describe, expect, it } from "vitest";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import { createTempStorage } from "@/invariants/testStorage";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";

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

  it("undo removes nodes and edges added after the history entry", async () => {
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

      const restored = await useGraphHistoryStore
        .getState()
        .undo(storage, linkEntry.id);

      expect(restored.nodes.map((row) => row.id)).toEqual(["n1"]);
      const graph = await storage.loadGraph();
      expect(graph.nodes.map((row) => row.id)).toEqual(["n1"]);
      expect(graph.edges).toHaveLength(0);
      const display = await storage.loadGraphForDisplay();
      expect(display.nodes.map((row) => row.id).sort()).toEqual(["n1"]);
      expect(display.edges).toHaveLength(0);
    } finally {
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
      expect(restored).toEqual(beforeSnapshot);
      expect((await storage.loadGraph()).nodes[0]?.archived).toBe(false);
      const rows = await storage.listGraphHistory();
      const row = rows.find((r) => r.id === entry.id);
      expect(row?.undone).toBe(true);
    } finally {
      cleanup();
    }
  });
});
