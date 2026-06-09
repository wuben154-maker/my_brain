import { describe, expect, it } from "vitest";
import { ConversationConductor } from "@/conversation/ConversationConductor";
import { createShowcaseCompanionContext } from "@/conversation/mockConversationFixtures";
import type { ConversationContext } from "@/conversation/types";
import { MockVoiceProvider } from "@/providers/voice/mockVoiceProvider";
import { createAppProviders } from "@/providers";
import { SHOWCASE_GRAPH_SNAPSHOT } from "@/showcase/showcaseFixtures";
import { useInterviewStore } from "@/stores/interviewStore";

function snapshotGraph(ctx: ConversationContext) {
  return JSON.stringify(ctx.graph);
}

function syncInterviewContext(ctx: ConversationContext): ConversationContext {
  const interview = useInterviewStore.getState();
  if (interview.questions.length === 0) {
    return ctx;
  }
  return {
    ...ctx,
    interviewSession: {
      questions: interview.questions,
      cursor: interview.cursor,
    },
  };
}

describe("interviewConductor integration", () => {
  it("enters interview mode with 5 questions and skip does not mutate graph", async () => {
    useInterviewStore.getState().reset();

    const providers = createAppProviders({ openAiApiKey: "" });
    let ctx: ConversationContext = createShowcaseCompanionContext({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
    });
    const graphBefore = snapshotGraph(ctx);

    const conductor = new ConversationConductor({
      llm: providers.llm,
      voice: new MockVoiceProvider(),
      getContext: () => syncInterviewContext(ctx),
      onTurn: (turn) => {
        if (turn.interviewAction === "start" && turn.interviewQuestions) {
          useInterviewStore.getState().start(turn.interviewQuestions);
        } else if (turn.nextState === "interview") {
          if (turn.interviewAction === "skip") {
            useInterviewStore.getState().skip();
          } else if (turn.interviewAction === "next") {
            useInterviewStore.getState().next();
          }
        } else if (useInterviewStore.getState().active) {
          useInterviewStore.getState().finish();
        }
        ctx = syncInterviewContext(ctx);
      },
    });

    const startTurn = await conductor.dispatch(
      { type: "interviewStart" },
      { speak: false },
    );
    expect(conductor.getState()).toBe("interview");
    expect(startTurn.interviewQuestions?.length).toBeGreaterThanOrEqual(5);
    expect(snapshotGraph(ctx)).toBe(graphBefore);

    const interview = useInterviewStore.getState();
    expect(interview.active).toBe(true);
    expect(interview.questions.length).toBeGreaterThanOrEqual(5);

    await conductor.dispatch({ type: "interviewSkip" }, { speak: false });
    expect(snapshotGraph(ctx)).toBe(graphBefore);

    const afterSkip = useInterviewStore.getState();
    expect(afterSkip.cursor).toBe(1);
    expect(afterSkip.skippedIds.length).toBe(1);

    let guard = 0;
    while (conductor.getState() === "interview" && guard < 10) {
      await conductor.dispatch({ type: "interviewNext" }, { speak: false });
      expect(snapshotGraph(ctx)).toBe(graphBefore);
      guard += 1;
    }

    expect(conductor.getState()).toBe("idle_chat");
    expect(useInterviewStore.getState().active).toBe(false);
  });

  it("voice trigger 考考我 enters interview without graph writes", async () => {
    useInterviewStore.getState().reset();

    const providers = createAppProviders({ openAiApiKey: "" });
    const ctx: ConversationContext = createShowcaseCompanionContext({
      graph: SHOWCASE_GRAPH_SNAPSHOT,
    });
    const graphBefore = snapshotGraph(ctx);

    const conductor = new ConversationConductor({
      llm: providers.llm,
      voice: new MockVoiceProvider(),
      getContext: () => ctx,
    });

    await conductor.dispatch(
      { type: "userSpeak", transcript: "考考我" },
      { speak: false },
    );

    expect(conductor.getState()).toBe("interview");
    expect(snapshotGraph(ctx)).toBe(graphBefore);
  });
});
