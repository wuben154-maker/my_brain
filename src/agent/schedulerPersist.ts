import type { AgentRunResult } from "./types";
import type { StorageProvider } from "@/storage/types";
import { useResearchRunStore } from "@/stores/researchRunStore";

/** Pending proposals older than this are marked expired (A5). */
export const DEFAULT_PENDING_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function persistAgentRunResult(
  storage: StorageProvider,
  result: AgentRunResult,
  maxAgeMs: number = DEFAULT_PENDING_MAX_AGE_MS,
): Promise<void> {
  for (const envelope of result.proposals) {
    await storage.saveProposal(envelope);
  }

  const cutoff = Date.now() - maxAgeMs;
  const pending = await storage.listPendingProposals();
  for (const envelope of pending) {
    if (Date.parse(envelope.createdAt) < cutoff) {
      await storage.setProposalStatus(envelope.id, "expired");
    }
  }

  if (
    result.trace.length > 0 &&
    result.proposals.some((item) => item.source === "research_loop")
  ) {
    useResearchRunStore.getState().addRun({
      runId: result.runId,
      trace: result.trace,
      digest: result.digest,
      finishedAt: result.finishedAt,
      topic: result.digest?.title.replace(/^研究报告：/, ""),
    });
  }
}
