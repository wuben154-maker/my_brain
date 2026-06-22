import type { EphemeralConversationState } from "./ephemeralChat.js";
import { createProvisionalCandidate } from "../provisional/queue.js";
import type { ProvisionalCandidate } from "../provisional/types.js";
import type { GraphRepository } from "../graph/types.js";

/** Detect explicit reject-memory intent — must not ingest to profile or graph. */
export function hasRejectMemoryIntent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return /(不要|别|不).{0,4}(记|入|收|保存|写入)/i.test(trimmed);
}

/** Detect explicit save intent — not casual chat. */
export function hasExplicitSaveIntent(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  if (hasRejectMemoryIntent(trimmed)) {
    return false;
  }
  return /记下来|记一下|记这个|保存这个|帮我记|收进|入库|要记/i.test(trimmed);
}

export function extractSaveSummaryFromChat(
  chat: EphemeralConversationState,
  userText: string,
): string {
  const trimmed = userText.trim();
  const lastUser = [...chat.turns].reverse().find((t) => t.role === "user");
  const context = lastUser?.text ?? trimmed;
  if (hasExplicitSaveIntent(trimmed) && context !== trimmed) {
    return context.slice(0, 120);
  }
  return trimmed.slice(0, 120) || context.slice(0, 120);
}

/** Create provisional asset candidate from chat save intent — not permanent ingest. */
export function createAssetCandidateFromChatSave(
  chat: EphemeralConversationState,
  userText: string,
): ProvisionalCandidate {
  const summary = extractSaveSummaryFromChat(chat, userText);
  return createProvisionalCandidate({
    sourceType: "text",
    summary,
    evidenceRefs: [`companion-chat:${chat.sessionId}`, `user-turn:${chat.totalUserTurns}`],
  });
}

/** Guard: save intent creates candidate only, never permanent node. */
export function assertSaveIntentCreatesCandidateOnly(
  graph: GraphRepository,
  beforeNodes: number,
  candidate: ProvisionalCandidate,
): void {
  if (graph.countVisibleNodes() !== beforeNodes) {
    throw new Error("save intent must not create permanent graph nodes");
  }
  if (candidate.status !== "pending") {
    throw new Error("asset candidate must start as pending");
  }
}
