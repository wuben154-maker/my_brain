import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { GraphMutationProposal } from "@/domain/graph";
import { createTempStorage } from "@/invariants/testStorage";
import {
  applyGraphMutation,
  persistGraphSnapshot,
} from "@/lib/graphMutations";
import { distillAndPersistUserProfile } from "@/lib/profileDistillation";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { BetterSqliteBackend } from "@/storage/adapters/betterSqliteBackend";
import type { StorageProvider } from "@/storage/types";

function wrapBackend(backend: BetterSqliteBackend): StorageProvider {
  return {
    init: async () => {
      backend.init();
    },
    close: async () => {
      backend.close();
    },
    loadGraph: async () => backend.loadGraph(),
    loadGraphForDisplay: async () => backend.loadGraphForDisplay(),
    saveConcept: async (node) => {
      backend.saveConcept(node);
    },
    saveEdge: async (edge) => {
      backend.saveEdge(edge);
    },
    deleteEdge: async (edgeId) => {
      backend.deleteEdge(edgeId);
    },
    loadUserProfile: async () => backend.loadUserProfile(),
    saveUserProfile: async (profile) => {
      backend.saveUserProfile(profile);
    },
  };
}

function reopenStorage(dbPath: string): StorageProvider {
  return wrapBackend(new BetterSqliteBackend({ dbPath }));
}

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

      await storage.close();

      const reopened = reopenStorage(dbPath);
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

      const reopened = reopenStorage(dbPath);
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

      const reopened = reopenStorage(dbPath);
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
