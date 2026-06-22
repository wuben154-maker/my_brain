import { describe, expect, it } from "vitest";

import { InMemoryGraphRepository, InMemoryHistoryRepository } from "../graph/memoryRepository.js";
import { confirmCandidate } from "../provisional/queue.js";
import { createEphemeralConversation, appendCasualTurn } from "./ephemeralChat.js";
import {
  assertSaveIntentCreatesCandidateOnly,
  createAssetCandidateFromChatSave,
  extractSaveSummaryFromChat,
  hasExplicitSaveIntent,
  hasRejectMemoryIntent,
} from "./saveIntent.js";

describe("save intent — CK-13 asset candidate", () => {
  it("detects explicit save phrases", () => {
    expect(hasExplicitSaveIntent("这个记下来")).toBe(true);
    expect(hasExplicitSaveIntent("随便聊聊")).toBe(false);
    expect(hasExplicitSaveIntent("别记录这个")).toBe(false);
  });

  it("detects reject-memory phrases without treating them as save intent", () => {
    expect(hasRejectMemoryIntent("别记录这个")).toBe(true);
    expect(hasRejectMemoryIntent("不要入库")).toBe(true);
    expect(hasRejectMemoryIntent("这个记下来")).toBe(false);
  });

  it("explicit save creates pending candidate without permanent node", () => {
    const graph = new InMemoryGraphRepository();
    const before = graph.countVisibleNodes();
    let chat = createEphemeralConversation();
    ({ state: chat } = appendCasualTurn(chat, "最近项目推进慢"));
    const candidate = createAssetCandidateFromChatSave(chat, "帮我把这句记下来");
    assertSaveIntentCreatesCandidateOnly(graph, before, candidate);
    expect(candidate.status).toBe("pending");
    expect(candidate.evidenceRefs[0]).toContain("companion-chat:");
  });

  it("extractSaveSummaryFromChat prefers recent user context", () => {
    let chat = createEphemeralConversation();
    ({ state: chat } = appendCasualTurn(chat, "Rust 所有权模型值得深入"));
    const summary = extractSaveSummaryFromChat(chat, "记下来");
    expect(summary).toContain("Rust");
  });

  it("chat save candidate becomes permanent only after confirmCandidate", () => {
    const graph = new InMemoryGraphRepository();
    const history = new InMemoryHistoryRepository();
    const before = graph.countVisibleNodes();
    let chat = createEphemeralConversation();
    ({ state: chat } = appendCasualTurn(chat, "Rust 所有权模型值得深入"));
    const candidate = createAssetCandidateFromChatSave(chat, "记下来");
    assertSaveIntentCreatesCandidateOnly(graph, before, candidate);

    const result = confirmCandidate([candidate], candidate.id, { graph, history });
    expect(graph.countVisibleNodes()).toBe(before + 1);
    expect(result.nodeId).toMatch(/^node-/);
  });
});
