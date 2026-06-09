import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { GraphMutationProposal } from "@/domain/graph";
import {
  createTempStorage,
  reopenStorage,
  STORAGE_BACKEND_KINDS,
  type StorageBackendKind,
} from "@/invariants/testStorage";
import { readRepoSource } from "@/invariants/readRepoSource";
import {
  applyGraphMutation,
  persistGraphSnapshot,
} from "@/lib/graphMutations";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import { distillAndPersistUserProfile } from "@/lib/profileDistillation";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import type { ProposalEnvelope } from "@/agent/types";
import { InvalidProposalError } from "@/storage/proposalPersistence";

const sampleProposalEnvelope: ProposalEnvelope = {
  id: "prop-create-1",
  runId: "run-1",
  createdAt: "2026-06-01T00:00:00.000Z",
  source: "background_ingest",
  status: "pending",
  proposal: {
    id: "prop-create-1",
    kind: "create",
    summary: "新建 RAG 概念",
    payload: {
      title: "RAG",
      intro: "检索增强生成",
      sourceUrl: "https://example.com/rag",
    },
  },
};

function countArchivedConcepts(dbPath: string): number {
  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .prepare("SELECT COUNT(*) AS count FROM concepts WHERE archived = 1")
      .get() as { count: number };
    return row.count;
  } finally {
    db.close();
  }
}

function countArchivedEdges(dbPath: string): number {
  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .prepare("SELECT COUNT(*) AS count FROM edges WHERE archived = 1")
      .get() as { count: number };
    return row.count;
  } finally {
    db.close();
  }
}

function readSyncEdgesSnapshotSource(relativePath: string): string {
  const source = readRepoSource(relativePath);
  const start = source.indexOf("syncEdgesSnapshot");
  expect(start).toBeGreaterThan(-1);
  const tail = source.slice(start);
  const end = tail.search(/\n {2}(async )?[a-zA-Z]+\(/);
  return end === -1 ? tail : tail.slice(0, end);
}

describe("SQLite persistence (better-sqlite3)", () => {
  it("creates db file and persists graph across close/reopen", async () => {
    const { storage, dbPath, cleanup } = createTempStorage();
    try {
      expect(existsSync(dbPath)).toBe(false);

      await storage.init();
      expect(existsSync(dbPath)).toBe(true);

      const createProposal: GraphMutationProposal = {
        id: "persist-create",
        kind: "create",
        summary: "持久化测试节点",
        payload: {
          title: "RAG",
          intro: "检索增强生成",
          sourceUrl: "https://example.com/rag",
        },
      };

      const afterCreate = applyGraphMutation({ nodes: [], edges: [] }, createProposal);
      await persistGraphSnapshot(storage, { nodes: [], edges: [] }, afterCreate);

      let graph = await storage.loadGraph();
      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0]?.title).toBe("RAG");
      expect(graph.nodes[0]?.sourceUrl).toBe("https://example.com/rag");
      expect(graph.nodes[0]?.salience).toBe(1);
      expect(graph.nodes[0]?.lastTouchedAt).toBeTruthy();

      await storage.close();

      const reopened = reopenStorage(dbPath, "better-sqlite3");
      await reopened.init();
      graph = await reopened.loadGraph();
      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0]?.intro).toBe("检索增强生成");
      await reopened.close();
    } finally {
      cleanup();
    }
  });

  it("persists update, link, archive-with-migration, and edge deletion", async () => {
    const { storage, dbPath, cleanup } = createTempStorage();
    try {
      await storage.init();

      let before = await storage.loadGraph();
      let after = applyGraphMutation(before, {
        id: "c1",
        kind: "create",
        summary: "A",
        payload: { title: "节点A", intro: "a", sourceUrl: null },
      });
      after = applyGraphMutation(after, {
        id: "c2",
        kind: "create",
        summary: "B",
        payload: { title: "节点B", intro: "b", sourceUrl: null },
      });
      after = applyGraphMutation(after, {
        id: "c3",
        kind: "create",
        summary: "C",
        payload: { title: "节点C", intro: "c", sourceUrl: null },
      });
      await persistGraphSnapshot(storage, before, after);

      const nodeB = after.nodes.find((node) => node.title === "节点B");
      const nodeC = after.nodes.find((node) => node.title === "节点C");
      expect(nodeB).toBeDefined();
      expect(nodeC).toBeDefined();

      before = await storage.loadGraph();
      after = applyGraphMutation(before, {
        id: "l1",
        kind: "link",
        summary: "连边",
        payload: {
          sourceId: nodeB!.id,
          targetId: nodeC!.id,
          relationType: "related",
        },
      });
      await persistGraphSnapshot(storage, before, after);
      expect((await storage.loadGraph()).edges).toHaveLength(1);

      before = await storage.loadGraph();
      const nodeA = before.nodes.find((node) => node.title === "节点A");
      after = applyGraphMutation(before, {
        id: "u1",
        kind: "update",
        summary: "更新A",
        payload: {
          nodeId: nodeA!.id,
          title: "节点A-更新",
          intro: "更新后的简介",
          sourceUrl: "https://example.com/a",
        },
      });
      await persistGraphSnapshot(storage, before, after);

      before = await storage.loadGraph();
      after = applyGraphMutation(before, {
        id: "a1",
        kind: "archive",
        summary: "归档B并迁移边",
        payload: {
          nodeId: nodeB!.id,
          migrateEdgesToNodeId: nodeA!.id,
        },
      });
      await persistGraphSnapshot(storage, before, after);

      const visible = await storage.loadGraph();
      expect(visible.nodes.map((node) => node.title).sort()).toEqual([
        "节点A-更新",
        "节点C",
      ]);
      expect(visible.edges).toHaveLength(1);
      expect(visible.edges[0]?.sourceId).toBe(nodeA!.id);
      expect(visible.edges[0]?.targetId).toBe(nodeC!.id);
      expect(countArchivedConcepts(dbPath)).toBe(1);

      const display = await storage.loadGraphForDisplay();
      expect(display.nodes).toHaveLength(3);
      expect(display.nodes.find((node) => node.title === "节点B")?.archived).toBe(
        true,
      );

      await storage.close();

      const reopened = reopenStorage(dbPath, "better-sqlite3");
      await reopened.init();
      const reloaded = await reopened.loadGraph();
      expect(reloaded.nodes.find((node) => node.title === "节点A-更新")?.sourceUrl).toBe(
        "https://example.com/a",
      );
      expect(reloaded.edges).toHaveLength(1);
      expect(countArchivedConcepts(dbPath)).toBe(1);
      await reopened.close();
    } finally {
      cleanup();
    }
  });
});

describe.each(STORAGE_BACKEND_KINDS)(
  "storage foreign keys (%s)",
  (kind: StorageBackendKind) => {
    it("rejects saveEdge when concept endpoints are missing", async () => {
      const { storage, cleanup } = createTempStorage(kind);
      try {
        await storage.init();
        await expect(
          storage.saveEdge({
            id: "orphan-edge",
            sourceId: "no-such-source",
            targetId: "no-such-target",
            relationType: "related",
          }),
        ).rejects.toThrow();
      } finally {
        cleanup();
      }
    });
  },
);

describe.each(STORAGE_BACKEND_KINDS)(
  "proposal inbox persistence (%s)",
  (kind: StorageBackendKind) => {
  it("creates agent_proposals table idempotently on init", async () => {
    const { storage, dbPath, cleanup } = createTempStorage(kind);
    try {
      await storage.init();
      await storage.init();

      const db = new Database(dbPath, { readonly: true });
      try {
        const table = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'agent_proposals'",
          )
          .get() as { name: string } | undefined;
        expect(table?.name).toBe("agent_proposals");

        const index = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_agent_proposals_status'",
          )
          .get() as { name: string } | undefined;
        expect(index?.name).toBe("idx_agent_proposals_status");
      } finally {
        db.close();
      }
    } finally {
      cleanup();
    }
  });

  it("round-trips proposals across close/reopen with payload JSON normalization", async () => {
    const { storage, dbPath, cleanup } = createTempStorage(kind);
    try {
      await storage.init();
      await storage.saveProposal(sampleProposalEnvelope);
      await storage.close();

      const reopened = reopenStorage(dbPath, kind);
      await reopened.init();
      const pending = await reopened.listPendingProposals();
      expect(pending).toHaveLength(1);
      expect(pending[0]).toMatchObject({
        id: "prop-create-1",
        runId: "run-1",
        source: "background_ingest",
        status: "pending",
        proposal: {
          kind: "create",
          summary: "新建 RAG 概念",
          payload: {
            title: "RAG",
            intro: "检索增强生成",
            sourceUrl: "https://example.com/rag",
          },
        },
      });
      await reopened.close();
    } finally {
      cleanup();
    }
  });

  it("upserts proposals by id", async () => {
    const { storage, cleanup } = createTempStorage(kind);
    try {
      await storage.init();
      await storage.saveProposal(sampleProposalEnvelope);
      await storage.saveProposal({
        ...sampleProposalEnvelope,
        proposal: {
          ...sampleProposalEnvelope.proposal,
          summary: "更新后的摘要",
          payload: {
            title: "RAG",
            intro: "更新后的简介",
            sourceUrl: null,
          },
        },
      });

      const pending = await storage.listPendingProposals();
      expect(pending).toHaveLength(1);
      expect(pending[0]?.proposal.summary).toBe("更新后的摘要");
      expect(pending[0]?.proposal.payload.intro).toBe("更新后的简介");
    } finally {
      cleanup();
    }
  });

  it("lists pending proposals oldest-first", async () => {
    const { storage, cleanup } = createTempStorage(kind);
    try {
      await storage.init();
      await storage.saveProposal({
        ...sampleProposalEnvelope,
        id: "prop-newer",
        createdAt: "2026-06-02T00:00:00.000Z",
        proposal: {
          ...sampleProposalEnvelope.proposal,
          id: "prop-newer",
        },
      });
      await storage.saveProposal(sampleProposalEnvelope);

      const pending = await storage.listPendingProposals();
      expect(pending.map((row) => row.id)).toEqual([
        "prop-create-1",
        "prop-newer",
      ]);
    } finally {
      cleanup();
    }
  });

  it("removes approved and rejected proposals from listPendingProposals", async () => {
    const { storage, cleanup } = createTempStorage(kind);
    try {
      await storage.init();
      await storage.saveProposal(sampleProposalEnvelope);
      await storage.saveProposal({
        ...sampleProposalEnvelope,
        id: "prop-reject-me",
        proposal: {
          ...sampleProposalEnvelope.proposal,
          id: "prop-reject-me",
        },
      });

      await storage.setProposalStatus("prop-create-1", "approved");
      await storage.setProposalStatus("prop-reject-me", "rejected");

      expect(await storage.listPendingProposals()).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("does not mutate graph tables when saving a proposal", async () => {
    const { storage, cleanup } = createTempStorage(kind);
    try {
      await storage.init();
      const before = await storage.loadGraph();
      await storage.saveProposal(sampleProposalEnvelope);
      const after = await storage.loadGraph();
      expect(after).toEqual(before);
    } finally {
      cleanup();
    }
  });

  it("rejects invalid proposal payload on save", async () => {
    const { storage, cleanup } = createTempStorage(kind);
    try {
      await storage.init();
      const invalid: ProposalEnvelope = {
        ...sampleProposalEnvelope,
        id: "prop-invalid",
        proposal: {
          ...sampleProposalEnvelope.proposal,
          id: "prop-invalid",
          payload: { title: "", intro: "" },
        },
      };
      await expect(storage.saveProposal(invalid)).rejects.toBeInstanceOf(
        InvalidProposalError,
      );
      expect(await storage.listPendingProposals()).toHaveLength(0);
    } finally {
      cleanup();
    }
  });

  it("rejects invalid link relationType via readLinkPayload validation", async () => {
    const { storage, cleanup } = createTempStorage(kind);
    try {
      await storage.init();
      const invalid: ProposalEnvelope = {
        id: "prop-bad-link",
        runId: "run-1",
        createdAt: "2026-06-01T00:00:00.000Z",
        source: "background_ingest",
        status: "pending",
        proposal: {
          id: "prop-bad-link",
          kind: "link",
          summary: "非法连边",
          payload: {
            sourceId: "a",
            targetId: "b",
            relationType: "not_a_relation",
          },
        },
      };
      await expect(storage.saveProposal(invalid)).rejects.toBeInstanceOf(
        InvalidProposalError,
      );
    } finally {
      cleanup();
    }
  });

  it("throws when setProposalStatus targets a missing proposal", async () => {
    const { storage, cleanup } = createTempStorage(kind);
    try {
      await storage.init();
      await expect(
        storage.setProposalStatus("missing-id", "approved"),
      ).rejects.toThrow(/Proposal not found/);
    } finally {
      cleanup();
    }
  });
  },
);

describe("syncEdgesSnapshot soft-archive (KOS-A3)", () => {
  it("storage adapters never SQL-delete edges in syncEdgesSnapshot", () => {
    for (const relativePath of [
      "src/storage/adapters/betterSqliteBackend.ts",
      "src/storage/adapters/tauriSqlStorage.ts",
    ]) {
      const fnSource = readSyncEdgesSnapshotSource(relativePath);
      expect(fnSource).not.toMatch(/DELETE FROM edges/i);
      expect(fnSource).toMatch(/archived\s*=\s*1/i);
    }
  });

  it.each(STORAGE_BACKEND_KINDS)(
    "syncEdgesSnapshot hides removed edges without deleting rows (%s)",
    async (kind: StorageBackendKind) => {
      const { storage, dbPath, cleanup } = createTempStorage(kind);
      try {
        await storage.init();
        const nodeA = {
          id: "n-a",
          title: "A",
          intro: "a",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        };
        const nodeB = {
          id: "n-b",
          title: "B",
          intro: "b",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        };
        await storage.saveConcept(nodeA);
        await storage.saveConcept(nodeB);
        await storage.saveEdge({
          id: "e-curate",
          sourceId: "n-a",
          targetId: "n-b",
          relationType: "related",
        });
        await storage.saveEdge({
          id: "e-keep",
          sourceId: "n-b",
          targetId: "n-a",
          relationType: "related",
        });

        await storage.syncEdgesSnapshot([
          {
            id: "e-keep",
            sourceId: "n-b",
            targetId: "n-a",
            relationType: "related",
          },
        ]);

        const graph = await storage.loadGraph();
        expect(graph.edges.map((edge) => edge.id)).toEqual(["e-keep"]);
        expect(countArchivedEdges(dbPath)).toBe(1);

        await storage.close();
        const reopened = reopenStorage(dbPath, kind);
        await reopened.init();
        const reloaded = await reopened.loadGraph();
        expect(reloaded.edges.map((edge) => edge.id)).toEqual(["e-keep"]);
        expect(countArchivedEdges(dbPath)).toBe(1);
        await reopened.close();
      } finally {
        cleanup();
      }
    },
  );

  it.each(STORAGE_BACKEND_KINDS)(
    "graphHistory undo archives curation edge and keeps later edge (%s)",
    async (kind: StorageBackendKind) => {
      const { storage, dbPath, cleanup } = createTempStorage(kind);
      try {
        await storage.init();
        useGraphHistoryStore.getState().clear();

        const node = {
          id: "n1",
          title: "RAG",
          intro: "intro",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        };
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
          before: { nodes: [node], edges: [] },
          after: {
            nodes: [node],
            edges: [
              {
                id: "e-curate",
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
          id: "e-curate",
          sourceId: "n1",
          targetId: "n2",
          relationType: "related",
        });
        await storage.saveEdge({
          id: "e-after-history",
          sourceId: "n1",
          targetId: "n2",
          relationType: "related",
        });

        const restored = await useGraphHistoryStore
          .getState()
          .undo(storage, linkEntry.id);

        expect(restored?.edges.map((edge) => edge.id)).toEqual(["e-after-history"]);
        expect(restored?.nodes.map((node) => node.id).sort()).toEqual(["n1", "n2"]);
        expect(countArchivedEdges(dbPath)).toBe(1);
        expect(
          (await storage.loadGraph()).edges.map((edge) => edge.id),
        ).toEqual(["e-after-history"]);
      } finally {
        useGraphHistoryStore.getState().clear();
        cleanup();
      }
    },
  );
});

describe("SQLite persistence (better-sqlite3)", () => {
  it("persists distilled user profile across close/reopen", async () => {
    const { storage, dbPath, cleanup } = createTempStorage();
    try {
      await storage.init();
      const llm = createMockLlmProvider();
      const transcript = "用户: 我叫测试员，我对 AI Agent 感兴趣\n";
      await distillAndPersistUserProfile(storage, llm, transcript);

      let profile = await storage.loadUserProfile();
      expect(profile.displayName).toBe("测试员");
      expect(profile.interests).toContain("AI Agent");

      await storage.close();

      const reopened = reopenStorage(dbPath, "better-sqlite3");
      await reopened.init();
      profile = await reopened.loadUserProfile();
      expect(profile.displayName).toBe("测试员");
      expect(profile.interests).toContain("AI Agent");
      await reopened.close();
    } finally {
      cleanup();
    }
  });
});
