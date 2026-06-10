import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import { formatPendingConceptRef } from "@/domain/learning/learningTrace";
import { createTempStorage } from "@/invariants/testStorage";
import {
  learningTraceStore,
  resetLearningSessionId,
} from "@/learning/learningTraceStore";
import {
  LEARNING_TRACE_DEDUP_WINDOW_MS,
  recordBriefingSkipTrace,
  recordLearningTrace,
  resetLearningTraceIdCounter,
  validateLearningTraceInput,
} from "@/learning/recordLearningTrace";
import type { StorageProvider } from "@/storage/types";
import { SHOWCASE_BRIEFING_ITEMS } from "@/showcase/showcaseFixtures";

describe("recordLearningTrace", () => {
  afterEach(() => {
    learningTraceStore.clear();
    resetLearningTraceIdCounter();
    resetLearningSessionId("test-session");
  });

  it("validates required fields", () => {
    expect(() =>
      validateLearningTraceInput({
        conceptRef: "",
        kind: "briefing_skip",
        sessionId: "s1",
      }),
    ).toThrow(/conceptRef/);
  });

  it("persists round-trip through SQLite storage", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();
    resetLearningSessionId("persist-session");

    await recordLearningTrace(
      {
        conceptRef: formatPendingConceptRef("voice-agent-starter"),
        kind: "briefing_elaborate",
        sessionId: "persist-session",
        metadata: { worldItemId: "showcase-brief-2", depth: 1 },
      },
      { storage: fixture.storage },
    );

    const rows = await fixture.storage.listLearningTraces();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("briefing_elaborate");
    expect(rows[0]?.metadata.depth).toBe(1);

    await learningTraceStore.load(fixture.storage);
    expect(learningTraceStore.listTracesForPendingRef("voice-agent-starter")).toHaveLength(
      1,
    );

    fixture.cleanup();
  });

  it("dedupes same session/kind/worldItem within window", async () => {
    resetLearningSessionId("dedupe-session");
    const item = SHOWCASE_BRIEFING_ITEMS[0]!;
    const at = "2026-06-01T12:00:00.000Z";

    const first = await recordBriefingSkipTrace(item, null, "dedupe-session");
    const second = await recordLearningTrace(
      {
        conceptRef: formatPendingConceptRef(item.title),
        kind: "briefing_skip",
        sessionId: "dedupe-session",
        at: new Date(Date.parse(at) + 60_000).toISOString(),
        metadata: { worldItemId: item.id },
      },
      { storage: null, dedupeWindowMs: LEARNING_TRACE_DEDUP_WINDOW_MS },
    );

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(learningTraceStore.listAll()).toHaveLength(1);
  });

  it("falls back to memory when storage save fails", async () => {
    const failingStorage: StorageProvider = {
      init: async () => undefined,
      close: async () => undefined,
      loadGraph: async () => ({ nodes: [], edges: [] }),
      loadGraphForDisplay: async () => ({ nodes: [], edges: [] }),
      saveConcept: async () => undefined,
      deleteConcept: async () => undefined,
      saveEdge: async () => undefined,
      deleteEdge: async () => undefined,
      syncEdgesSnapshot: async () => undefined,
      loadUserProfile: async () => DEFAULT_USER_PROFILE,
      saveUserProfile: async () => undefined,
      listPendingProposals: async () => [],
      saveProposal: async () => undefined,
      setProposalStatus: async () => undefined,
      getAppMeta: async () => null,
      setAppMeta: async () => undefined,
      loadAgentUsage: async () => 0,
      addAgentUsage: async () => undefined,
      listGraphHistory: async () => [],
      saveGraphHistoryEntry: async () => undefined,
      setGraphHistoryUndone: async () => undefined,
      listLearningTraces: async () => [],
      saveLearningTrace: async () => {
        throw new Error("disk full");
      },
      listCognitiveActions: async () => [],
      saveCognitiveAction: async () => undefined,
      listBriefingFeedback: async () => [],
      saveBriefingFeedback: async () => undefined,
      saveProject: async () => undefined,
      deleteProject: async () => undefined,
      saveSource: async () => undefined,
      saveDecision: async () => undefined,
      saveQuestion: async () => undefined,
      saveSkill: async () => undefined,
      deleteSource: async () => undefined,
      deleteDecision: async () => undefined,
      deleteQuestion: async () => undefined,
      deleteSkill: async () => undefined,
    };

    await recordLearningTrace(
      {
        conceptRef: "showcase-ingest-graphiti",
        kind: "briefing_ingest",
        sessionId: "warn-session",
        metadata: { worldItemId: "showcase-brief-3", nodeId: "showcase-ingest-graphiti" },
      },
      { storage: failingStorage },
    );

    expect(learningTraceStore.listAll()).toHaveLength(1);
    expect(learningTraceStore.getPersistWarning()).toBe(true);
  });
});
