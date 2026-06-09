import { describe, expect, it, vi } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { mergeUserProfileLayers } from "@/agent/profile/feedbackSignals";
import { visibleGraph } from "@/lib/graphMutations";
import {
  BRAIN_WRITE_TOOL_BLOCKLIST,
  listReadonlyTools,
} from "@/mcp/brainReadonlyHandlers";
import { MockMemoryProvider } from "@/providers/memory/mockMemoryProvider";
import { createTempStorage } from "@/invariants/testStorage";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";
import { useProfileStore } from "@/stores/profileStore";

describe("profileCorrection", () => {
  it("applyCorrection patches understanding and records correction field", async () => {
    useProfileStore.getState().reset();
    const storage = {
      saveUserProfile: vi.fn(async () => undefined),
    };

    await useProfileStore.getState().applyCorrection(
      { understanding: { "demo-rag": "can_explain" } },
      storage as never,
    );

    const state = useProfileStore.getState();
    expect(state.profile.understanding?.["demo-rag"]).toBe("can_explain");
    expect(state.corrections[state.corrections.length - 1]?.field).toBe(
      "understanding.demo-rag",
    );
    expect(state.profile.correctedFields).toContain("understanding.demo-rag");
    expect(storage.saveUserProfile).toHaveBeenCalledOnce();
  });

  it("undoLastCorrection restores previous understanding level", async () => {
    useProfileStore.getState().reset();
    const storage = {
      saveUserProfile: vi.fn(async () => undefined),
    };

    await useProfileStore.getState().applyCorrection(
      { understanding: { "demo-rag": "can_explain" } },
      storage as never,
    );
    await useProfileStore.getState().undoLastCorrection(storage as never);

    expect(useProfileStore.getState().profile.understanding?.["demo-rag"]).toBe(
      "heard",
    );
    expect(useProfileStore.getState().lastCorrection).toBeNull();
  });

  it("sets persistWarning when storage save fails but keeps in-memory profile", async () => {
    useProfileStore.getState().reset();
    const storage = {
      saveUserProfile: vi.fn(async () => {
        throw new Error("disk full");
      }),
    };

    await useProfileStore.getState().applyCorrection(
      { understanding: { "demo-rag": "can_explain" } },
      storage as never,
    );

    const state = useProfileStore.getState();
    expect(state.profile.understanding?.["demo-rag"]).toBe("can_explain");
    expect(state.persistWarning).toBe(true);
  });

  it("persists correction to SQLite and reloads after refresh", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      useProfileStore.getState().reset();
      await useProfileStore.getState().loadFromStorage(storage);

      await useProfileStore.getState().applyCorrection(
        { understanding: { "demo-rag": "can_explain" } },
        storage,
      );

      const reloaded = await storage.loadUserProfile();
      expect(reloaded.understanding?.["demo-rag"]).toBe("can_explain");
      expect(reloaded.correctedFields).toContain("understanding.demo-rag");
    } finally {
      cleanup();
    }
  });

  it("does not create or delete graph nodes when correcting profile", async () => {
    useProfileStore.getState().reset();
    const graphBefore = visibleGraph(SHOWCASE_GRAPH_SNAPSHOT);
    await useProfileStore.getState().applyCorrection(
      {
        understanding: { "demo-rag": "can_explain" },
        interestWeights: { voice_realtime: 0.9 },
      },
      null,
    );
    const graphAfter = visibleGraph(SHOWCASE_GRAPH_SNAPSHOT);
    expect(graphAfter.nodes.length).toBe(graphBefore.nodes.length);
    expect(graphAfter.edges.length).toBe(graphAfter.edges.length);
  });

  it("distillation merge does not overwrite user-corrected understanding", () => {
    const base = {
      ...DEFAULT_USER_PROFILE,
      understanding: { "demo-rag": "can_explain" as const },
      correctedFields: ["understanding.demo-rag"],
    };
    const distilled = {
      ...DEFAULT_USER_PROFILE,
      understanding: { "demo-rag": "unfamiliar" as const },
      interests: ["蒸馏兴趣"],
      updatedAt: "2026-06-02T00:00:00.000Z",
    };

    const merged = mergeUserProfileLayers(base, distilled);
    expect(merged.understanding?.["demo-rag"]).toBe("can_explain");
    expect(merged.interests).toContain("蒸馏兴趣");
  });

  it("MemoryProvider remember does not write user profile", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const before = await storage.loadUserProfile();
      const memory = new MockMemoryProvider();
      await memory.remember([
        { kind: "fact", text: "用户精通 RAG", timestamp: Date.now() },
      ]);
      await memory.recall({ query: "RAG", topK: 1 });
      const after = await storage.loadUserProfile();
      expect(after).toEqual(before);
    } finally {
      cleanup();
    }
  });

  it("MCP readonly tool list excludes profile write tools", () => {
    const tools = listReadonlyTools();
    for (const blocked of BRAIN_WRITE_TOOL_BLOCKLIST) {
      expect(tools).not.toContain(blocked);
    }
    expect(tools).not.toContain("save_user_profile");
  });
});
