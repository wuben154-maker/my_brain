/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConversationConductor } from "@/conversation/ConversationConductor";
import { createShowcaseCompanionContext } from "@/conversation/mockConversationFixtures";
import type { ConversationContext } from "@/conversation/types";
import { LEARNING_TRACE_FIXTURES } from "@/domain/learning/learningTrace";
import { createTempStorage } from "@/invariants/testStorage";
import { learningTraceStore, resetLearningSessionId } from "@/learning/learningTraceStore";
import { resetLearningTraceIdCounter } from "@/learning/recordLearningTrace";
import { MockVoiceProvider } from "@/providers/voice/mockVoiceProvider";
import { createAppProviders } from "@/providers";
import {
  runShowcaseCompanionScript,
  SHOWCASE_INGEST_NODE_ID,
} from "@/showcase/showcaseCompanionScript";
import { useIngestStore } from "@/stores/ingestStore";

describe("learningTraceConductor integration", () => {
  beforeEach(() => {
    learningTraceStore.clear();
    resetLearningTraceIdCounter();
    resetLearningSessionId("showcase-trace-session");
    useIngestStore.getState().reset();
    window.location.search = "?showcase=1";
    process.env.VITE_SHOWCASE_DEMO = "1";
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
    delete process.env.VITE_SHOWCASE_DEMO;
  });

  it("showcase briefing script produces golden learning traces", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();

    const providers = createAppProviders({ openAiApiKey: "" });
    let ctx: ConversationContext = createShowcaseCompanionContext();

    const conductor = new ConversationConductor({
      llm: providers.llm,
      voice: new MockVoiceProvider(),
      storage: fixture.storage,
      getContext: () => ctx,
      onContextPatch: (patch) => {
        if (patch.newsCursor !== undefined) {
          ctx = { ...ctx, newsCursor: patch.newsCursor };
        }
      },
    });

    await runShowcaseCompanionScript({
      conductor,
      getContext: () => ctx,
      ingestDeps: {
        storage: fixture.storage,
        llm: providers.llm,
        profile: ctx.profile,
      },
      speak: false,
    });

    const persisted = await fixture.storage.listLearningTraces();
    expect(persisted.length).toBeGreaterThanOrEqual(3);

    const ingestTraces = persisted.filter(
      (trace) => trace.conceptRef === SHOWCASE_INGEST_NODE_ID,
    );
    expect(ingestTraces).toHaveLength(1);
    expect(ingestTraces[0]?.kind).toBe("briefing_ingest");

    for (const golden of LEARNING_TRACE_FIXTURES) {
      const matches = persisted.filter(
        (trace) =>
          trace.kind === golden.kind &&
          trace.conceptRef === golden.conceptRef &&
          trace.metadata.worldItemId === golden.metadata.worldItemId,
      );
      expect(matches.length).toBeGreaterThanOrEqual(1);
      if (golden.metadata.depth !== undefined) {
        expect(matches[0]?.metadata.depth).toBe(golden.metadata.depth);
      }
      if (golden.metadata.nodeId) {
        expect(matches[0]?.metadata.nodeId).toBe(golden.metadata.nodeId);
      }
    }

    const pendingOnly = learningTraceStore.listTracesForConcept(SHOWCASE_INGEST_NODE_ID);
    expect(pendingOnly).toHaveLength(1);

    const skipPending = learningTraceStore.listTracesForPendingRef(
      LEARNING_TRACE_FIXTURES[0]!.conceptRef,
    );
    expect(skipPending.some((row) => row.kind === "briefing_skip")).toBe(true);

    fixture.cleanup();
  });
});
