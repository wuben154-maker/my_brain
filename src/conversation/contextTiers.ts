import type { BrainGraphSnapshot } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import {
  conversationStateToPackMode,
  formatGraphContextPack,
  pickSubgraphForTurn,
  type ContextPackMode,
  type GraphContextPack,
} from "@/lib/graphContextPack";
import { coarseToFineRecall } from "@/lib/memoryLayers";
import { selectRecallMix } from "@/lib/memoryGrounding";
import type { ConversationContext, ConversationState } from "@/conversation/types";
import type { MemoryProvider } from "@/providers/memory/types";

export interface WorkingContext {
  state: ConversationState;
  /** Last user + assistant lines, capped at 300 chars. */
  transcriptTail: string;
  activeNewsId?: string;
  walkthroughNodeIds: string[];
  pack: GraphContextPack | null;
}

export interface ArchivalContext {
  graph: BrainGraphSnapshot;
  profile: UserProfile;
  recalledMemories?: string;
}

export const TRANSCRIPT_TAIL_MAX_CHARS = 300;

/** Light recall for chat/banter; standard for news/knowledge/walkthrough. */
export function recallTopKForState(state: ConversationState): number {
  switch (state) {
    case "idle_chat":
    case "small_talk":
      return 2;
    case "briefing":
    case "ingest_decision":
    case "teaching":
      return 5;
    default:
      return 3;
  }
}

export async function resolveRecalledMemoriesForTurn(
  memory: MemoryProvider | undefined,
  query: string,
  state: ConversationState,
): Promise<string | undefined> {
  const trimmed = query.trim();
  if (!memory || !trimmed) {
    return undefined;
  }

  const topK = recallTopKForState(state);
  try {
    const recalled = await coarseToFineRecall(memory, trimmed, {
      maxPerLayer: { topic: Math.min(2, topK), fact: topK },
    });
    const mixed = selectRecallMix(recalled).slice(0, topK);
    if (mixed.length === 0) {
      return undefined;
    }
    return mixed.map((entry) => entry.item.text.trim()).join("；");
  } catch {
    return undefined;
  }
}

export function createEmptyWorking(
  state: ConversationState = "idle_chat",
): WorkingContext {
  return {
    state,
    transcriptTail: "",
    walkthroughNodeIds: [],
    pack: null,
  };
}

export function appendTranscriptTail(
  working: WorkingContext,
  line: string,
): void {
  const addition = line.trim();
  if (!addition) {
    return;
  }
  const combined = working.transcriptTail
    ? `${working.transcriptTail}\n${addition}`
    : addition;
  working.transcriptTail =
    combined.length > TRANSCRIPT_TAIL_MAX_CHARS
      ? combined.slice(-TRANSCRIPT_TAIL_MAX_CHARS)
      : combined;
}

export function shrinkWorkingOnInterrupt(working: WorkingContext): void {
  working.transcriptTail = "";
  working.walkthroughNodeIds = [];
}

export function shrinkWorkingOnStateChange(
  prev: ConversationState,
  next: ConversationState,
  working: WorkingContext,
): void {
  working.state = next;
  if (prev === "teaching" && next === "idle_chat") {
    working.walkthroughNodeIds = [];
    working.pack = null;
  }
}

export function workingContextFootprint(working: WorkingContext): number {
  const packChars =
    (working.pack?.graphDigest.length ?? 0) +
    (working.pack?.profileDigest.length ?? 0);
  return (
    working.transcriptTail.length +
    working.walkthroughNodeIds.join(",").length +
    packChars
  );
}

export function buildTieredContext(input: {
  archival: ArchivalContext;
  working: WorkingContext;
  mode: ContextPackMode;
}): Pick<
  ConversationContext,
  "graph" | "profile" | "personaId" | "recalledMemories" | "graphContextDigest"
> {
  const pack =
    input.working.pack ??
    pickSubgraphForTurn({
      graph: input.archival.graph,
      profile: input.archival.profile,
      mode: input.mode,
      query: input.working.transcriptTail.trim() || undefined,
      highlightNodeIds:
        input.working.walkthroughNodeIds.length > 0
          ? input.working.walkthroughNodeIds
          : undefined,
    });

  const graphContextDigest = formatGraphContextPack(pack);

  return {
    graph: input.archival.graph,
    profile: input.archival.profile,
    personaId: input.archival.profile.persona,
    recalledMemories: input.archival.recalledMemories,
    graphContextDigest: graphContextDigest || undefined,
  };
}

export function refreshWorkingPack(
  archival: ArchivalContext,
  working: WorkingContext,
  options?: { packQuery?: string; newsTitle?: string },
): void {
  const mode = conversationStateToPackMode(working.state);
  let query = options?.packQuery?.trim() ?? working.transcriptTail.trim();
  if (!query && (mode === "briefing" || mode === "ingest_decision")) {
    query = options?.newsTitle?.trim() ?? "";
  }

  working.pack = pickSubgraphForTurn({
    graph: archival.graph,
    profile: archival.profile,
    mode,
    query: query || undefined,
    highlightNodeIds:
      working.walkthroughNodeIds.length > 0
        ? working.walkthroughNodeIds
        : undefined,
  });
}
