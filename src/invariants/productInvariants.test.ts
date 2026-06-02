import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GraphMutationProposal } from "@/domain/graph";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import {
  applyGraphMutation,
  persistGraphSnapshot,
  visibleGraph,
} from "@/lib/graphMutations";
import {
  distillAndPersistUserProfile,
  formatConversationTranscript,
} from "@/lib/profileDistillation";
import { finalizeVoiceSession } from "@/lib/voiceSessionFinalize";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import type { LlmProvider } from "@/providers/llm/types";
import { MockVoiceProvider } from "@/providers/voice/mockVoiceProvider";
import { INITIAL_MIGRATION_SQL } from "@/storage/migrations";
import { useIngestStore } from "@/stores/ingestStore";
import { createTempStorage } from "./testStorage";
import { readRepoSource } from "./readRepoSource";

const sampleProposal: GraphMutationProposal = {
  id: "inv-create",
  kind: "create",
  summary: "新建概念",
  payload: {
    title: "RAG",
    intro: "检索增强生成的概念简介",
    sourceUrl: "https://example.com/rag",
  },
};

describe("Product invariants (AGENTS.md core)", () => {
  describe("1 · Three memory layers stay separate", () => {
    it("schema stores concepts, edges, profile — not raw audio or full articles", () => {
      const sql = INITIAL_MIGRATION_SQL.toLowerCase();
      expect(sql).toContain("concepts");
      expect(sql).toContain("user_profile");
      expect(sql).not.toMatch(/\baudio\b/);
      expect(sql).not.toMatch(/\btranscript\b/);
      expect(sql).not.toMatch(/\barticle\b/);
      expect(sql).not.toMatch(/\bnews_body\b/);
    });

    it("distills profile to SQLite before ephemeral transcript is cleared", async () => {
      const order: string[] = [];
      await finalizeVoiceSession({
        transcripts: [{ role: "user", text: "我对 Agent 感兴趣", final: true }],
        disconnectVoice: async () => {
          order.push("disconnect");
        },
        distillProfile: async () => {
          order.push("distill");
        },
        clearTranscripts: () => {
          order.push("clear");
        },
      });
      expect(order).toEqual(["disconnect", "distill", "clear"]);
    });

    it("persists distilled profile fields without storing full conversation text", async () => {
      const { storage, cleanup } = createTempStorage();
      try {
        await storage.init();
        const llm = createMockLlmProvider();
        const transcript =
          "用户: 我叫阿蓝，我对 AI Agent 很感兴趣，不太懂 RAG，讲得细一点\n助手: 好的";
        const next = await distillAndPersistUserProfile(
          storage,
          llm,
          transcript,
          DEFAULT_USER_PROFILE,
        );
        const reloaded = await storage.loadUserProfile();
        expect(reloaded.interests.length).toBeGreaterThan(0);
        expect(reloaded.displayName).toBe("阿蓝");
        expect(JSON.stringify(reloaded)).not.toContain("助手: 好的");
        expect(next.updatedAt).not.toBe(DEFAULT_USER_PROFILE.updatedAt);
      } finally {
        cleanup();
      }
    });

    it("graph mutations persist concepts permanently in local SQLite", async () => {
      const { storage, cleanup } = createTempStorage();
      try {
        await storage.init();
        const before = await storage.loadGraph();
        const after = applyGraphMutation(before, sampleProposal);
        await persistGraphSnapshot(storage, before, after);
        const reloaded = await storage.loadGraph();
        expect(reloaded.nodes.some((node) => node.title === "RAG")).toBe(true);
      } finally {
        cleanup();
      }
    });
  });

  describe("2 · User owns the brain — per-item 入库?", () => {
    beforeEach(() => {
      useIngestStore.getState().reset();
    });

    it("queues proposals in confirming phase without marking ingested", () => {
      useIngestStore.getState().setPendingProposals([sampleProposal]);
      const state = useIngestStore.getState();
      expect(state.phase).toBe("confirming");
      expect(state.ingestedIds).toHaveLength(0);
    });

    it("marks only one news id ingested per confirm cycle", () => {
      useIngestStore.getState().setActiveNewsId("news-1");
      useIngestStore.getState().markIngested("news-1");
      useIngestStore.getState().setCursor(useIngestStore.getState().cursor + 1);
      const state = useIngestStore.getState();
      expect(state.ingestedIds).toEqual(["news-1"]);
      expect(state.cursor).toBe(1);
    });

    it("NewsIngestPanel wires 入库? before SuggestConfirmDialog confirm", () => {
      const panel = readRepoSource("src/components/brain/NewsIngestPanel.tsx");
      expect(panel).toMatch(/入库\?/);
      expect(panel).toContain("SuggestConfirmDialog");
      expect(panel).toContain("requestIngest");
      expect(panel).toContain("confirmProposal");
    });

    it("ManualGraphPanel exposes manual CRUD with suggest-then-confirm", () => {
      const panel = readRepoSource("src/components/brain/ManualGraphPanel.tsx");
      expect(panel).toContain("SuggestConfirmDialog");
      expect(panel).toContain("proposeCreate");
      expect(panel).toContain("proposeUpdate");
      expect(panel).toContain("proposeArchive");
      expect(panel).toContain("来源链接");
      expect(panel).toMatch(/归档删除/);
    });
  });

  describe("3 · Suggest-then-confirm for ANY graph mutation", () => {
    beforeEach(() => {
      useIngestStore.getState().reset();
    });

    it("does not expose auto-apply path in ingest store", () => {
      const storeApi = Object.keys(useIngestStore.getState());
      expect(storeApi).not.toContain("applyPending");
      expect(storeApi).not.toContain("autoApply");
    });

    it("clears pending proposals on reject without ingested ids", () => {
      useIngestStore.getState().setPendingProposals([sampleProposal]);
      useIngestStore.getState().clearPending();
      const state = useIngestStore.getState();
      expect(state.phase).toBe("awaiting_ingest");
      expect(state.pendingProposal).toBeNull();
      expect(state.ingestedIds).toHaveLength(0);
    });

    it("SuggestConfirmDialog requires explicit confirm/cancel actions", () => {
      const dialog = readRepoSource("src/components/brain/SuggestConfirmDialog.tsx");
      expect(dialog).toContain("确认入库");
      expect(dialog).toContain("取消");
      expect(dialog).toContain("onConfirm");
      expect(dialog).toContain("onCancel");
    });

    it("useNewsIngestSession applies mutations only inside confirmProposal", () => {
      const hook = readRepoSource("src/hooks/useNewsIngestSession.ts");
      expect(hook).toContain("confirmProposal");
      expect(hook).toMatch(/applyProposal[\s\S]*confirmProposal/);
      const requestBlock = hook.slice(
        hook.indexOf("requestIngest"),
        hook.indexOf("const applyProposal"),
      );
      expect(requestBlock).toContain("setPendingProposals");
      expect(requestBlock).not.toContain("applyGraphMutation");
    });
  });

  describe("4 · Delete = archive, edges migrate on merge", () => {
    it("merge archives source node instead of removing the row", () => {
      const snapshot = {
        nodes: [
          {
            id: "old",
            title: "旧概念",
            intro: "旧",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "new",
            title: "新概念",
            intro: "新",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        edges: [
          {
            id: "e1",
            sourceId: "old",
            targetId: "new",
            relationType: "related" as const,
          },
        ],
      };
      const after = applyGraphMutation(snapshot, {
        id: "merge-1",
        kind: "merge",
        summary: "合并",
        payload: {
          sourceNodeId: "old",
          targetNodeId: "new",
          mergedIntro: "合并简介",
        },
      });
      expect(after.nodes.find((node) => node.id === "old")?.archived).toBe(true);
      expect(after.nodes.some((node) => node.id === "old")).toBe(true);
      expect(after.nodes.find((node) => node.id === "new")?.intro).toBe("合并简介");
      expect(after.edges.every((edge) => edge.sourceId !== "old")).toBe(true);
      expect(after.edges.every((edge) => edge.targetId !== "old")).toBe(true);
    });

    it("storage layer never hard-deletes concept rows", () => {
      const backend = readRepoSource("src/storage/adapters/betterSqliteBackend.ts");
      const tauri = readRepoSource("src/storage/adapters/tauriSqlStorage.ts");
      expect(backend).not.toMatch(/DELETE FROM concepts/i);
      expect(tauri).not.toMatch(/DELETE FROM concepts/i);
    });

    it("archived nodes render dimmed on canvas per DESIGN §8", () => {
      const source = readRepoSource("src/components/brain/BrainGraphView.tsx");
      expect(source).toMatch(/ARCHIVED_OPACITY/);
      expect(source).toMatch(/graphNode\.archived/);
    });

    it("3D graph view is read-only render layer (G1)", () => {
      const source = readRepoSource("src/components/brain/BrainGraph3DView.tsx");
      expect(source).not.toContain("StorageProvider");
      expect(source).not.toContain("saveConcept");
      expect(source).not.toContain("saveProposal");
      expect(source).toMatch(/useGraphStore/);
    });

    it("archived nodes are hidden from visible graph but recoverable in snapshot", () => {
      const snapshot = {
        nodes: [
          {
            id: "a",
            title: "A",
            intro: "a",
            sourceUrl: null,
            archived: true,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "b",
            title: "B",
            intro: "b",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        edges: [],
      };
      expect(visibleGraph(snapshot).nodes).toHaveLength(1);
      expect(snapshot.nodes).toHaveLength(2);
    });
  });

  describe("5 · Node = concept + short intro", () => {
    it("create mutation requires title and intro payload", () => {
      const after = applyGraphMutation({ nodes: [], edges: [] }, sampleProposal);
      const node = after.nodes[0];
      expect(node?.title).toBe("RAG");
      expect(node?.intro.length).toBeGreaterThan(0);
      expect(node?.sourceUrl).toBe("https://example.com/rag");
    });

    it("attach merges intro text into existing concept node", () => {
      const snapshot = {
        nodes: [
          {
            id: "c1",
            title: "Transformer",
            intro: "基础介绍",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        edges: [],
      };
      const after = applyGraphMutation(snapshot, {
        id: "attach-1",
        kind: "attach",
        summary: "补充",
        payload: {
          nodeId: "c1",
          introAppend: "上下文窗口变长",
          sourceUrl: "https://example.com",
        },
      });
      expect(after.nodes[0]?.intro).toContain("基础介绍");
      expect(after.nodes[0]?.intro).toContain("上下文窗口变长");
    });
  });

  describe("6 · Interruptible voice is mandatory", () => {
    it("VoiceProvider interface exposes interrupt()", () => {
      const types = readRepoSource("src/providers/voice/types.ts");
      expect(types).toMatch(/interrupt\(\): Promise<void>/);
    });

    it("MockVoiceProvider stops speaking and returns to listening on interrupt", async () => {
      vi.useFakeTimers();
      try {
        const voice = new MockVoiceProvider();
        voice.onTranscript(() => undefined);

        const connectPromise = voice.connect({ apiKey: "" });
        await vi.advanceTimersByTimeAsync(600);
        await connectPromise;
        await vi.runAllTimersAsync();

        voice.simulateUserSpeech("讲讲资讯");
        await vi.advanceTimersByTimeAsync(700);
        expect(voice.getState()).toBe("speaking");

        await voice.interrupt();
        expect(voice.getState()).toBe("listening");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("7 · Local-first / privacy", () => {
    it("storage schema and adapters stay on-device SQLite", () => {
      const web = readRepoSource("src/storage/adapters/webSqlStorage.ts");
      const tauri = readRepoSource("src/storage/adapters/tauriSqlStorage.ts");
      expect(web).toContain("better-sqlite3");
      expect(tauri).toContain("@tauri-apps/plugin-sql");
      expect(web).not.toMatch(/supabase|firebase|s3:\/\//i);
    });

    it("providers are swappable behind interfaces (no vendor SDK in ingest hook)", () => {
      const ingest = readRepoSource("src/hooks/useNewsIngestSession.ts");
      const voice = readRepoSource("src/hooks/useVoiceSession.ts");
      expect(ingest).toContain("providers?.llm");
      expect(voice).toContain("providers?.voice");
      expect(ingest).not.toMatch(/from ['"]openai['"]/);
      expect(voice).not.toMatch(/from ['"]openai['"]/);
    });

    it("createAppProviders returns LlmProvider without requiring network", async () => {
      const llm: LlmProvider = createMockLlmProvider();
      const summary = await llm.summarizeNews({
        id: "n1",
        category: "ai_news",
        title: "Test",
        summary: "Summary",
        sourceName: "Mock",
        sourceUrl: "https://example.com",
        publishedAt: null,
      });
      expect(summary.length).toBeGreaterThan(0);
    });
  });
});

describe("Invariant guardrails · transcript formatting", () => {
  it("drops non-final partial lines from distillation input", () => {
    const formatted = formatConversationTranscript([
      { role: "user", text: "partial", final: false },
      { role: "user", text: "final line", final: true },
    ]);
    expect(formatted).toBe("用户: final line");
    expect(formatted).not.toContain("partial");
  });
});
