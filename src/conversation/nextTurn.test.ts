import { describe, expect, it } from "vitest";
import { nextTurn } from "@/conversation/nextTurn";
import {
  createFixtureContext,
  createIdleCompanionContext,
  FIXTURE_NEWS,
} from "@/conversation/mockConversationFixtures";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";

describe("nextTurn (pure state machine)", () => {
  const llm = createMockLlmProvider();

  it("sessionStart with onboarding emits intro turn", async () => {
    const ctx = createFixtureContext();
    const turn = await nextTurn("idle_chat", { type: "sessionStart" }, ctx, llm);
    expect(turn.say).toMatch(/称呼|名字/);
    expect(turn.expect).toBe("free");
  });

  it("idle_chat + userSpeak (greeting) → small_talk", async () => {
    const ctx = createIdleCompanionContext();
    const turn = await nextTurn(
      "idle_chat",
      { type: "userSpeak", transcript: "你好" },
      ctx,
      llm,
    );
    expect(turn.nextState).toBe("small_talk");
    expect(turn.expect).toBe("free");
  });

  it("small_talk + newsAvailable → briefing then ingest_decision", async () => {
    const ctx = createIdleCompanionContext();
    const briefing = await nextTurn(
      "small_talk",
      { type: "newsAvailable", queueLength: FIXTURE_NEWS.length },
      ctx,
      llm,
    );
    expect(briefing.say.length).toBeGreaterThan(10);
    expect(briefing.nextState).toBe("ingest_decision");
    expect(briefing.expect).toBe("ingest");

    const ask = await nextTurn(
      "ingest_decision",
      { type: "userSpeak", transcript: "嗯" },
      ctx,
      llm,
    );
    expect(ask.say).toMatch(/入库/);
    expect(ask.expect).toBe("ingest");
  });

  it("ingestReprompt re-asks 入库", async () => {
    const ctx = createIdleCompanionContext();
    const turn = await nextTurn(
      "ingest_decision",
      { type: "ingestReprompt" },
      ctx,
      llm,
    );
    expect(turn.say).toMatch(/入库/);
    expect(turn.nextState).toBe("ingest_decision");
  });

  it("ingestReprompt with reason explains failure and stays in ingest_decision", async () => {
    const ctx = createIdleCompanionContext();
    const turn = await nextTurn(
      "ingest_decision",
      { type: "ingestReprompt", reason: "入库没成功：mock persist failed" },
      ctx,
      llm,
    );
    expect(turn.say).toMatch(/入库没成功/);
    expect(turn.say).toMatch(/入库/);
    expect(turn.nextState).toBe("ingest_decision");
    expect(turn.expect).toBe("ingest");
  });

  it("ingestAnswer skip advances toward idle", async () => {
    const ctx = createIdleCompanionContext();
    const turn = await nextTurn(
      "ingest_decision",
      { type: "ingestAnswer", command: "skip" },
      ctx,
      llm,
    );
    expect(turn.nextState).toBe("briefing");
  });

  it("ingestAnswer ingest on first_star celebrates", async () => {
    const ctx = createFixtureContext({
      onboarding: { active: true, step: "first_star", interestRounds: 2 },
    });
    const turn = await nextTurn(
      "ingest_decision",
      { type: "ingestAnswer", command: "ingest" },
      ctx,
      llm,
    );
    expect(turn.say).toMatch(/第一颗星|亮起/);
    expect(turn.nextState).toBe("idle_chat");
  });

  it("topicRequest → teaching with highlights stub", async () => {
    const ctx = createIdleCompanionContext({
      graph: {
        nodes: [
          {
            id: "n-rag",
            title: "RAG",
            intro: "检索增强",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        edges: [],
      },
    });
    const turn = await nextTurn(
      "idle_chat",
      { type: "topicRequest", topic: "RAG" },
      ctx,
      llm,
    );
    expect(turn.nextState).toBe("teaching");
    expect(turn.highlightNodeIds).toContain("n-rag");
  });

  it("userInterrupt returns empty say without changing ingest_decision", async () => {
    const ctx = createIdleCompanionContext();
    const turn = await nextTurn(
      "ingest_decision",
      { type: "userInterrupt" },
      ctx,
      llm,
    );
    expect(turn.say).toBe("");
    expect(turn.nextState).toBe("ingest_decision");
  });

  it("persona changes say voice (mentor vs geek)", async () => {
    const mentorCtx = createIdleCompanionContext({
      profile: { ...createIdleCompanionContext().profile, persona: "mentor" },
      personaId: "mentor",
    });
    const geekCtx = createIdleCompanionContext({
      profile: { ...createIdleCompanionContext().profile, persona: "geek" },
      personaId: "geek",
    });
    const mentorTurn = await nextTurn(
      "idle_chat",
      { type: "sessionStart" },
      mentorCtx,
      llm,
    );
    const geekTurn = await nextTurn(
      "idle_chat",
      { type: "sessionStart" },
      geekCtx,
      llm,
    );
    expect(mentorTurn.say).not.toBe(geekTurn.say);
  });
});
