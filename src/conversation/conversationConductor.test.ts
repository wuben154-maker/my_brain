import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConversationConductor,
  type ConversationConductorDeps,
} from "@/conversation/ConversationConductor";
import {
  createFixtureContext,
  createIdleCompanionContext,
} from "@/conversation/mockConversationFixtures";
import type { ConversationContext } from "@/conversation/types";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { MockVoiceProvider } from "@/providers/voice/mockVoiceProvider";

describe("ConversationConductor", () => {
  let voice: MockVoiceProvider;
  let ctx: ConversationContext;
  const llm = createMockLlmProvider();

  beforeEach(() => {
    voice = new MockVoiceProvider();
    ctx = createIdleCompanionContext();
  });

  function createConductor(
    onContextPatch?: ConversationConductorDeps["onContextPatch"],
  ) {
    return new ConversationConductor({
      llm,
      voice,
      getContext: () => ctx,
      onContextPatch: (patch) => {
        if (patch.onboarding) {
          ctx = { ...ctx, onboarding: patch.onboarding };
        }
        if (patch.newsCursor !== undefined) {
          ctx = { ...ctx, newsCursor: patch.newsCursor };
        }
        onContextPatch?.(patch);
      },
    });
  }

  it("start emits non-empty first turn", async () => {
    const conductor = createConductor();
    const turn = await conductor.start({ speak: false });
    expect(turn?.say.length).toBeGreaterThan(0);
    expect(conductor.getState()).toBe("idle_chat");
  });

  it("briefing → ingest_decision path on newsAvailable", async () => {
    const conductor = createConductor();
    await conductor.start({ speak: false });
    await conductor.dispatch(
      { type: "newsAvailable", queueLength: ctx.newsQueue.length },
      { speak: false },
    );
    expect(conductor.getState()).toBe("ingest_decision");
  });

  it("userInterrupt calls voice.interrupt", async () => {
    const conductor = createConductor();
    const interruptSpy = vi.spyOn(voice, "interrupt");

    await conductor.dispatch({ type: "userInterrupt" }, { speak: false });
    expect(interruptSpy).toHaveBeenCalled();
    expect(conductor.getState()).toBe("idle_chat");
  });

  it("onboarding cold-start reaches ingest_decision on first_star briefing", async () => {
    ctx = createFixtureContext();
    const conductor = createConductor();
    await conductor.start({ speak: false });

    await conductor.dispatch(
      { type: "userSpeak", transcript: "阿蓝" },
      { speak: false },
    );
    await conductor.dispatch(
      { type: "userSpeak", transcript: "Agent 编排" },
      { speak: false },
    );
    await conductor.dispatch(
      { type: "userSpeak", transcript: "RAG 检索" },
      { speak: false },
    );
    await conductor.dispatch(
      { type: "userSpeak", transcript: "多模态" },
      { speak: false },
    );

    expect(conductor.getState()).toBe("ingest_decision");
    expect(ctx.onboarding.step).toBe("first_star");
  });

  it("multi-turn small_talk ↔ briefing without deadlock", async () => {
    const conductor = createConductor();
    await conductor.start({ speak: false });

    await conductor.dispatch(
      { type: "userSpeak", transcript: "你好" },
      { speak: false },
    );
    expect(conductor.getState()).toBe("small_talk");

    await conductor.dispatch(
      { type: "newsAvailable", queueLength: ctx.newsQueue.length },
      { speak: false },
    );
    expect(conductor.getState()).toBe("ingest_decision");

    await conductor.dispatch(
      { type: "ingestAnswer", command: "skip" },
      { speak: false },
    );
    expect(["briefing", "idle_chat"]).toContain(conductor.getState());
  });
});
