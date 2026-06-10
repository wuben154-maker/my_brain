import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrainGraphSnapshot, GraphMutationProposal } from "@/domain/graph";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import { createTempStorage } from "@/invariants/testStorage";
import { applyGraphMutation } from "@/lib/graphMutations";
import { buildGraphHistoryEntry } from "@/lib/graphHistoryMeta";
import { runAutoCurateAfterIngest } from "@/lib/runAutoCuratePipeline";
import { bootstrapShowcaseGraph } from "@/showcase/showcaseDemoMode";
import {
  buildShowcaseIngestCreateProposal,
  SHOWCASE_AUTO_CURATE_GOLDEN,
  SHOWCASE_PROFILE,
} from "@/showcase/showcaseFixtures";
import {
  GRAPH_SCHEMA_MIGRATION_STEPS,
  GRAPH_SCHEMA_VERSION_BASELINE,
  GRAPH_SCHEMA_VERSION_META_KEY,
  readGraphSchemaVersionSqlite,
} from "@/storage/schemaMigrations";
import {
  coTransactGraphAndHistory,
  coTransactGraphUndo,
  MUST_CO_TRANSACT_MUTATION_PATHS,
  persistGraphSnapshotSafe,
  recoverGraphToSnapshot,
  StorageCoTransactionError,
} from "@/storage/transaction";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import Database from "better-sqlite3";

const showcaseEnv = () => {
  process.env.VITE_SHOWCASE_DEMO = "1";
};
const clearShowcaseEnv = () => {
  delete process.env.VITE_SHOWCASE_DEMO;
};

const baseNode = {
  id: "n-base",
  title: "Base",
  intro: "base",
  sourceUrl: null,
  archived: false,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

function linkProposal(sourceId: string, targetId: string): GraphMutationProposal {
  return {
    id: "p-link",
    kind: "link",
    summary: "link",
    payload: { sourceId, targetId, relationType: "related" },
  };
}

describe("storageTransaction", () => {
  it("documents must-co-transact mutation paths", () => {
    expect(MUST_CO_TRANSACT_MUTATION_PATHS).toContain("runAutoCurateAfterIngest");
    expect(MUST_CO_TRANSACT_MUTATION_PATHS).toContain("graphHistoryStore.undo");
  });

  it("exposes graph schema versioning baseline for KP-08+", () => {
    expect(GRAPH_SCHEMA_VERSION_BASELINE).toBe(1);
    expect(GRAPH_SCHEMA_VERSION_META_KEY).toBe("graph_schema_version");
    expect(GRAPH_SCHEMA_MIGRATION_STEPS).toHaveLength(5);
    expect(GRAPH_SCHEMA_MIGRATION_STEPS.map((step) => step.version)).toEqual([
      2, 3, 4, 5, 6,
    ]);
  });

  it("coTransactGraphAndHistory persists graph and history together", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await storage.saveConcept(baseNode);
      const otherNode = {
        ...baseNode,
        id: "n-other",
        title: "Other",
      };
      await storage.saveConcept(otherNode);
      const before: BrainGraphSnapshot = { nodes: [baseNode, otherNode], edges: [] };
      const validAfter = applyGraphMutation(
        before,
        linkProposal("n-base", "n-other"),
      );
      const entry = buildGraphHistoryEntry(
        linkProposal("n-base", "n-other"),
        before,
        validAfter,
      );

      await coTransactGraphAndHistory(storage, before, validAfter, entry);

      const graph = await storage.loadGraph();
      expect(graph.edges).toHaveLength(1);
      const rows = await storage.listGraphHistory();
      expect(rows.some((row) => row.id === entry.id)).toBe(true);
    } finally {
      cleanup();
    }
  });

  it("readGraphSchemaVersionSqlite defaults to baseline on fresh db", async () => {
    const { dbPath, cleanup } = createTempStorage();
    try {
      const db = new Database(dbPath);
      db.exec(
        "CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
      );
      expect(readGraphSchemaVersionSqlite(db)).toBe(GRAPH_SCHEMA_VERSION_BASELINE);
      db.close();
    } finally {
      cleanup();
    }
  });
});

describe("undoRoundTrip", () => {
  beforeEach(() => {
    useGraphHistoryStore.getState().clear();
  });

  it("showcase ingest → auto-curate → undo restores graph matching history", async () => {
    showcaseEnv();
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await bootstrapShowcaseGraph(storage);
      const ingestProposal = buildShowcaseIngestCreateProposal();
      const beforeIngest = await storage.loadGraphForDisplay();
      const afterIngest = applyGraphMutation(beforeIngest, ingestProposal);
      await persistGraphSnapshotSafe(storage, beforeIngest, afterIngest);

      const recorded = await runAutoCurateAfterIngest(
        SHOWCASE_AUTO_CURATE_GOLDEN.sourceId,
        { storage, profile: SHOWCASE_PROFILE },
      );
      expect(recorded).toHaveLength(1);
      const linkEntry = recorded[0]!;

      const beforeUndo = await storage.loadGraph();
      const restored = await useGraphHistoryStore
        .getState()
        .undo(storage, linkEntry.id);

      expect(restored).toBeTruthy();
      expect(
        restored!.edges.some(
          (edge) =>
            edge.sourceId === SHOWCASE_AUTO_CURATE_GOLDEN.sourceId &&
            edge.targetId === SHOWCASE_AUTO_CURATE_GOLDEN.targetId,
        ),
      ).toBe(false);
      expect(
        restored!.nodes.some(
          (node) => node.id === SHOWCASE_AUTO_CURATE_GOLDEN.sourceId,
        ),
      ).toBe(true);

      const historyRow = (await storage.listGraphHistory()).find(
        (row) => row.id === linkEntry.id,
      );
      expect(historyRow?.undone).toBe(true);
      expect(
        beforeUndo.edges.some(
          (edge) =>
            edge.sourceId === SHOWCASE_AUTO_CURATE_GOLDEN.sourceId &&
            edge.targetId === SHOWCASE_AUTO_CURATE_GOLDEN.targetId,
        ),
      ).toBe(true);
    } finally {
      clearShowcaseEnv();
      cleanup();
    }
  });

  it("coTransactGraphUndo round-trips archive mutation", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await storage.saveConcept(baseNode);
      const before: BrainGraphSnapshot = { nodes: [baseNode], edges: [] };
      const after: BrainGraphSnapshot = {
        nodes: [{ ...baseNode, archived: true }],
        edges: [],
      };
      const entry: GraphHistoryEntry = {
        id: "hist-archive",
        at: "2026-06-01T00:00:00.000Z",
        kind: "archive",
        summary: "archive",
        reasonCode: "manual",
        reasonDetail: "",
        affectedNodeIds: [baseNode.id],
        before,
        after,
      };
      await coTransactGraphAndHistory(storage, before, after, entry);

      const current = await storage.loadGraphForDisplay();
      await coTransactGraphUndo(storage, current, entry);

      const graph = await storage.loadGraph();
      expect(graph.nodes[0]?.archived).toBe(false);
      const row = (await storage.listGraphHistory()).find((r) => r.id === entry.id);
      expect(row?.undone).toBe(true);
    } finally {
      cleanup();
    }
  });
});

describe("failureInjection", () => {
  it("rolls back graph when history persist fails after graph write", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await storage.saveConcept(baseNode);
      const before: BrainGraphSnapshot = { nodes: [baseNode], edges: [] };
      const otherNode = { ...baseNode, id: "n-other", title: "Other" };
      const after: BrainGraphSnapshot = {
        nodes: [baseNode, otherNode],
        edges: [
          {
            id: "e1",
            sourceId: "n-base",
            targetId: "n-other",
            relationType: "related",
          },
        ],
      };
      const entry = buildGraphHistoryEntry(
        linkProposal("n-base", "n-other"),
        before,
        after,
      );

      const originalSaveHistory = storage.saveGraphHistoryEntry.bind(storage);
      vi.spyOn(storage, "saveGraphHistoryEntry").mockImplementation(async () => {
        throw new Error("injected history failure");
      });

      await expect(
        coTransactGraphAndHistory(storage, before, after, entry),
      ).rejects.toBeInstanceOf(StorageCoTransactionError);

      const graph = await storage.loadGraph();
      expect(graph.nodes).toHaveLength(1);
      expect(graph.edges).toHaveLength(0);
      expect((await storage.listGraphHistory()).some((r) => r.id === entry.id)).toBe(
        false,
      );

      vi.mocked(storage.saveGraphHistoryEntry).mockRestore();
      await originalSaveHistory(entry);
    } finally {
      cleanup();
    }
  });

  it("persistGraphSnapshotSafe recovers when saveConcept throws mid-flight", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await storage.saveConcept(baseNode);
      const before: BrainGraphSnapshot = { nodes: [baseNode], edges: [] };

      const originalSaveEdge = storage.saveEdge.bind(storage);
      vi.spyOn(storage, "saveEdge").mockImplementation(async () => {
        throw new Error("injected graph failure");
      });

      const afterWithEdge: BrainGraphSnapshot = {
        nodes: [
          baseNode,
          { ...baseNode, id: "n-new", title: "New" },
        ],
        edges: [
          {
            id: "e-fail",
            sourceId: "n-base",
            targetId: "n-new",
            relationType: "related",
          },
        ],
      };

      await expect(
        persistGraphSnapshotSafe(storage, before, afterWithEdge),
      ).rejects.toBeInstanceOf(StorageCoTransactionError);

      const graph = await storage.loadGraph();
      expect(graph.nodes.map((n) => n.id)).toEqual(["n-base"]);
      vi.mocked(storage.saveEdge).mockRestore();
      void originalSaveEdge;
    } finally {
      cleanup();
    }
  });

  it("recoverGraphToSnapshot restores a prior snapshot", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      await storage.saveConcept(baseNode);
      const before: BrainGraphSnapshot = { nodes: [baseNode], edges: [] };
      const mutated: BrainGraphSnapshot = {
        nodes: [{ ...baseNode, title: "Mutated" }],
        edges: [],
      };
      await persistGraphSnapshotSafe(storage, before, mutated);
      await recoverGraphToSnapshot(storage, before);
      const graph = await storage.loadGraph();
      expect(graph.nodes[0]?.title).toBe("Base");
    } finally {
      cleanup();
    }
  });
});
