import { describe, expect, it } from "vitest";

import { InMemoryGraphRepository } from "../graph/memoryRepository.js";
import { inferUserModeProfileFromDialogue } from "../radar/adaptiveRadar.js";
import { extractPersonalSignalsFromEphemeralChat } from "../observer/personalObserver.js";
import {
  EPHEMERAL_CONTEXT_MAX_TURNS,
  EPHEMERAL_SESSION_MAX_MS,
  appendCasualTurn,
  createEphemeralConversation,
  isEphemeralSessionActive,
  rejectEphemeralMemory,
  runCasualChatGraphBoundaryCheck,
  simulateExtendedCasualSession,
  trimEphemeralContext,
} from "./ephemeralChat.js";

describe("ephemeral companion chat — CK-12", () => {
  it("ten-minute casual session creates no permanent graph nodes", () => {
    const graph = new InMemoryGraphRepository();
    const utterances = Array.from({ length: 24 }, (_, i) => `陪聊第 ${i + 1} 句：最近项目有点慢`);
    const start = Date.UTC(2026, 5, 21, 10, 0, 0);

    const { finalState, nodeCount } = runCasualChatGraphBoundaryCheck(
      graph,
      utterances,
      start,
    );

    expect(nodeCount).toBe(0);
    expect(finalState.totalUserTurns).toBe(24);
    expect(finalState.turns.length).toBeLessThanOrEqual(EPHEMERAL_CONTEXT_MAX_TURNS);
    expect(isEphemeralSessionActive(finalState, start + 9 * 60_000)).toBe(true);
    expect(isEphemeralSessionActive(finalState, start + EPHEMERAL_SESSION_MAX_MS + 1)).toBe(false);
  });

  it("ephemeral context stays short-term with rolling trim", () => {
    let state = createEphemeralConversation(0);
    for (let i = 0; i < EPHEMERAL_CONTEXT_MAX_TURNS + 4; i += 1) {
      ({ state } = appendCasualTurn(state, `消息 ${i}`, i * 1000));
    }
    const trimmed = trimEphemeralContext(state);
    expect(trimmed.turns.length).toBeLessThanOrEqual(EPHEMERAL_CONTEXT_MAX_TURNS);
    expect(trimmed.contextSummary).toContain("近期陪聊");
  });

  it("reject memory marks session as do-not-persist", () => {
    let state = createEphemeralConversation();
    ({ state } = appendCasualTurn(state, "别记录这个"));
    state = rejectEphemeralMemory(state);
    expect(state.memoryRejected).toBe(true);
    expect(state.turns.at(-1)?.text).toContain("不会写入");
  });

  it("reject memory blocks personal observer signals from ephemeral chat", () => {
    let chat = createEphemeralConversation();
    ({ state: chat } = appendCasualTurn(chat, "最近项目推进慢，Rust 所有权还没完全懂"));
    chat = rejectEphemeralMemory(chat);
    const profile = inferUserModeProfileFromDialogue(["学 Rust 所有权"], "cold-learner");
    const signals = extractPersonalSignalsFromEphemeralChat(chat, profile);
    expect(signals).toEqual([]);
  });

  it("simulateExtendedCasualSession spans ten minutes without ingest side effects", () => {
    const start = 1_700_000_000_000;
    const utterances = ["最近焦虑", "项目推进慢", "只想聊聊", "今天天气不错", "继续说说"];
    const state = simulateExtendedCasualSession(utterances, start, 120_000);
    const lastAt = state.turns.at(-1)?.atMs ?? start;
    expect(lastAt - start).toBeLessThanOrEqual(EPHEMERAL_SESSION_MAX_MS);
    expect(state.totalUserTurns).toBe(utterances.length);
    expect(state.turns.some((t) => t.role === "assistant" && t.text.includes("星图"))).toBe(true);
  });
});
