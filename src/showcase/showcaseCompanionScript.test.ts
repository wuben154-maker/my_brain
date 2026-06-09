import { beforeEach, describe, expect, it } from "vitest";
import { ConversationConductor } from "@/conversation/ConversationConductor";
import { createShowcaseCompanionContext } from "@/conversation/mockConversationFixtures";
import type { ConversationContext } from "@/conversation/types";
import { createTempStorage } from "@/invariants/testStorage";
import { bootstrapShowcaseGraph } from "@/showcase/showcaseDemoMode";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { MockVoiceProvider } from "@/providers/voice/mockVoiceProvider";
import {
  briefingStepFromCursor,
  expectedShowcaseBriefId,
  runShowcaseCompanionScript,
  SHOWCASE_COMPANION_SCRIPT,
  SHOWCASE_COMPANION_SCRIPT_FROM_VOICE,
} from "@/showcase/showcaseCompanionScript";
import {
  SHOWCASE_DESIGNATED_INGEST_BRIEF_ID,
  SHOWCASE_VOICE_SCRIPT,
} from "@/showcase/showcaseFixtures";
import { useIngestStore } from "@/stores/ingestStore";

describe("showcaseCompanionScript", () => {
  beforeEach(() => {
    useIngestStore.getState().reset();
    process.env.VITE_SHOWCASE_DEMO = "1";
  });

  it("defines a step sequence aligned with SHOWCASE_VOICE_SCRIPT ingest steps", () => {
    const ingestVoiceSteps = SHOWCASE_VOICE_SCRIPT.filter(
      (step) => step.kind === "ingest_parse",
    ).map((step) => step.transcript);
    const ingestScriptSteps = SHOWCASE_COMPANION_SCRIPT.filter(
      (step) => step.action === "ingest_command",
    ).map((step) => step.transcript);
    expect(ingestScriptSteps).toEqual(ingestVoiceSteps);
    expect(SHOWCASE_COMPANION_SCRIPT_FROM_VOICE.length).toBeGreaterThan(0);
  });

  it("maps briefing step indices to fixed brief ids", () => {
    expect(expectedShowcaseBriefId(0)).toBe("showcase-brief-1");
    expect(expectedShowcaseBriefId(1)).toBe("showcase-brief-2");
    expect(expectedShowcaseBriefId(2)).toBe(SHOWCASE_DESIGNATED_INGEST_BRIEF_ID);
    expect(expectedShowcaseBriefId("done")).toBeUndefined();
    expect(briefingStepFromCursor(3)).toBe("done");
  });

  it("advances showcase briefing through skip / elaborate / ingest", async () => {
    const fixture = createTempStorage();
    await fixture.storage.init();
    await bootstrapShowcaseGraph(fixture.storage);

    let ctx: ConversationContext = createShowcaseCompanionContext();
    const voice = new MockVoiceProvider();
    const llm = createMockLlmProvider();
    const conductor = new ConversationConductor({
      llm,
      voice,
      getContext: () => ctx,
      onContextPatch: (patch) => {
        if (patch.newsCursor !== undefined) {
          ctx = { ...ctx, newsCursor: patch.newsCursor };
        }
      },
    });

    const result = await runShowcaseCompanionScript(
      {
        conductor,
        getContext: () => ctx,
        ingestDeps: {
          storage: fixture.storage,
          llm,
          profile: ctx.profile,
        },
        speak: false,
      },
      SHOWCASE_COMPANION_SCRIPT,
    );

    expect(result.skippedIds).toContain("showcase-brief-1");
    expect(result.skippedIds).toContain("showcase-brief-2");
    expect(result.ingestedIds).toContain(SHOWCASE_DESIGNATED_INGEST_BRIEF_ID);
    expect(result.peakElaborationDepth).toBeGreaterThanOrEqual(1);
    expect(result.newsCursor).toBe(3);
    expect(result.finalBriefingStep).toBe("done");
    expect(conductor.getShowcaseBriefingStep()).toBe("done");

    fixture.cleanup();
  });
});
