import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConversationConductor,
  type ConversationConductorDeps,
} from "@/conversation/ConversationConductor";
import * as nextTurnModule from "@/conversation/nextTurn";
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

  it("userInterrupt during in-flight userSpeak keeps working context shrunk", async () => {
    const conductor = createConductor();
    await conductor.start({ speak: false });

    let releaseSpeak: (() => void) | undefined;
    const speakBlocked = new Promise<void>((resolve) => {
      releaseSpeak = resolve;
    });
    const realNextTurn = nextTurnModule.nextTurn;
    vi.spyOn(nextTurnModule, "nextTurn").mockImplementation(
      async (state, event, ctx, llm) => {
        if (event.type === "userSpeak") {
          await speakBlocked;
          return {
            say: "助手：这条回复不应在 interrupt 之后留在 transcriptTail",
            nextState: state,
            expect: "free",
          };
        }
        return realNextTurn(state, event, ctx, llm);
      },
    );

    const speakPromise = conductor.dispatch(
      { type: "userSpeak", transcript: "讲讲 RAG" },
      { speak: false },
    );
    await Promise.resolve();

    const interruptPromise = conductor.dispatch(
      { type: "userInterrupt" },
      { speak: false },
    );

    releaseSpeak?.();
    await Promise.all([speakPromise, interruptPromise]);

    expect(conductor.getWorkingContext().transcriptTail).toBe("");
    expect(conductor.getWorkingFootprint()).toBe(0);
    vi.restoreAllMocks();
  });

  it("userInterrupt shrinks working context footprint", async () => {
    const conductor = createConductor();
    await conductor.start({ speak: false });

    await conductor.dispatch(
      { type: "userSpeak", transcript: "讲讲 RAG 检索增强生成" },
      { speak: false },
    );
    const working = conductor.getWorkingContext();
    working.transcriptTail = "x".repeat(300);
    working.walkthroughNodeIds = [
      "node-a",
      "node-b",
      "node-c",
      "node-d",
      "node-e",
    ];
    const before = conductor.getWorkingFootprint();
    expect(before).toBeGreaterThan(320);

    await conductor.dispatch({ type: "userInterrupt" }, { speak: false });

    expect(conductor.getWorkingContext().transcriptTail).toBe("");
    expect(conductor.getWorkingContext().walkthroughNodeIds).toEqual([]);
    expect(conductor.getWorkingFootprint()).toBeLessThan(before);
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

  it("ingestReprompt re-asks after ambiguous voice answer", async () => {
    const conductor = createConductor();
    await conductor.start({ speak: false });
    await conductor.dispatch(
      { type: "newsAvailable", queueLength: ctx.newsQueue.length },
      { speak: false },
    );
    const reprompt = await conductor.dispatch(
      { type: "ingestReprompt" },
      { speak: false },
    );
    expect(reprompt.expect).toBe("ingest");
    expect(reprompt.say).toMatch(/入库/);
    expect(conductor.getState()).toBe("ingest_decision");
  });

  it("ingestAnswer ingest celebrates on first_star", async () => {
    ctx = createFixtureContext();
    const conductor = createConductor();
    await conductor.start({ speak: false });
    for (const line of ["阿蓝", "Agent 编排", "RAG 检索", "多模态"]) {
      await conductor.dispatch(
        { type: "userSpeak", transcript: line },
        { speak: false },
      );
    }
    await conductor.dispatch(
      { type: "ingestAnswer", command: "ingest" },
      { speak: false },
    );
    expect(ctx.onboarding.step).toBe("done");
  });

  it("recallMemories injects recalledMemories into nextTurn context", async () => {
    const recallMemories = vi.fn(async () => "用户偏好简洁解释");
    const nextTurnSpy = vi.spyOn(nextTurnModule, "nextTurn");
    const conductor = new ConversationConductor({
      llm,
      voice,
      getContext: () => ctx,
      recallMemories,
    });

    await conductor.start({ speak: false });

    expect(recallMemories).toHaveBeenCalled();
    const calls = nextTurnSpy.mock.calls;
    const lastCtx = calls[calls.length - 1]?.[2];
    expect(lastCtx?.recalledMemories).toBe("用户偏好简洁解释");
    nextTurnSpy.mockRestore();
  });

  it("P0-7-R1: recallMemories on second userSpeak with transcriptTail growth", async () => {
    const recallMemories = vi.fn(async () => "用户偏好简洁解释");
    const conductor = new ConversationConductor({
      llm,
      voice,
      getContext: () => ctx,
      recallMemories,
    });

    await conductor.start({ speak: false });
    recallMemories.mockClear();

    await conductor.dispatch(
      { type: "userSpeak", transcript: "你好" },
      { speak: false },
    );
    const tailAfterFirst = conductor.getWorkingContext().transcriptTail;
    expect(tailAfterFirst).toContain("你好");

    await conductor.dispatch(
      { type: "userSpeak", transcript: "讲讲 RAG" },
      { speak: false },
    );

    expect(recallMemories).toHaveBeenCalledTimes(2);
    expect(conductor.getWorkingContext().transcriptTail.length).toBeGreaterThan(
      tailAfterFirst.length,
    );
    expect(recallMemories).toHaveBeenNthCalledWith(2, {
      query: "讲讲 RAG",
      state: expect.any(String),
    });
  });

  it("start with speak:true calls voice.speak for opening line", async () => {
    const speakSpy = vi.spyOn(voice, "speak");
    const conductor = createConductor();
    await conductor.start({ speak: true });
    expect(speakSpy).toHaveBeenCalled();
    expect(speakSpy.mock.calls[0]?.[0]?.length).toBeGreaterThan(0);
    speakSpy.mockRestore();
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
