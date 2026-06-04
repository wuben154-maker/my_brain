import { create } from "zustand";
import type { GraphMutationProposal } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";

export type IngestPhase =
  | "idle"
  | "explaining"
  | "awaiting_ingest"
  | "confirming";

interface IngestState {
  cursor: number;
  phase: IngestPhase;
  explanation: string;
  /** Deeper briefing rounds after「讲细点」. */
  elaborationDepth: number;
  /** Voice parse attempt for current ingest question (1 → reprompt, 2 → default skip). */
  ingestParseAttempt: 1 | 2;
  pendingProposal: GraphMutationProposal | null;
  pendingProposalQueue: GraphMutationProposal[];
  activeNewsId: string | null;
  skippedIds: string[];
  ingestedIds: string[];
  errorMessage: string | null;
  reset: () => void;
  bumpElaborationDepth: () => void;
  resetElaborationDepth: () => void;
  setIngestParseAttempt: (attempt: 1 | 2) => void;
  resetIngestParseAttempt: () => void;
  setCursor: (cursor: number) => void;
  setPhase: (phase: IngestPhase) => void;
  setExplanation: (explanation: string) => void;
  setPendingProposals: (proposals: GraphMutationProposal[]) => void;
  clearPending: () => void;
  shiftPendingProposal: () => GraphMutationProposal | null;
  setActiveNewsId: (id: string | null) => void;
  markSkipped: (id: string) => void;
  markIngested: (id: string) => void;
  setError: (message: string | null) => void;
}

export const useIngestStore = create<IngestState>((set, get) => ({
  cursor: 0,
  phase: "idle",
  explanation: "",
  elaborationDepth: 0,
  ingestParseAttempt: 1,
  pendingProposal: null,
  pendingProposalQueue: [],
  activeNewsId: null,
  skippedIds: [],
  ingestedIds: [],
  errorMessage: null,
  reset: () =>
    set({
      cursor: 0,
      phase: "idle",
      explanation: "",
      elaborationDepth: 0,
      ingestParseAttempt: 1,
      pendingProposal: null,
      pendingProposalQueue: [],
      activeNewsId: null,
      skippedIds: [],
      ingestedIds: [],
      errorMessage: null,
    }),
  bumpElaborationDepth: () =>
    set((state) => ({ elaborationDepth: state.elaborationDepth + 1 })),
  resetElaborationDepth: () => set({ elaborationDepth: 0 }),
  setIngestParseAttempt: (ingestParseAttempt) => set({ ingestParseAttempt }),
  resetIngestParseAttempt: () => set({ ingestParseAttempt: 1 }),
  setCursor: (cursor) => set({ cursor }),
  setPhase: (phase) => set({ phase }),
  setExplanation: (explanation) => set({ explanation }),
  setPendingProposals: (proposals) =>
    set({
      pendingProposalQueue: proposals,
      pendingProposal: proposals[0] ?? null,
      phase: proposals.length > 0 ? "confirming" : "awaiting_ingest",
    }),
  clearPending: () =>
    set({
      pendingProposal: null,
      pendingProposalQueue: [],
      phase: "awaiting_ingest",
    }),
  shiftPendingProposal: () => {
    const queue = [...get().pendingProposalQueue];
    queue.shift();
    const next = queue[0] ?? null;
    set({
      pendingProposalQueue: queue,
      pendingProposal: next,
      phase: next ? "confirming" : "awaiting_ingest",
    });
    return next;
  },
  setActiveNewsId: (activeNewsId) => set({ activeNewsId }),
  markSkipped: (id) =>
    set((state) => ({
      skippedIds: state.skippedIds.includes(id)
        ? state.skippedIds
        : [...state.skippedIds, id],
    })),
  markIngested: (id) =>
    set((state) => ({
      ingestedIds: state.ingestedIds.includes(id)
        ? state.ingestedIds
        : [...state.ingestedIds, id],
    })),
  setError: (errorMessage) => set({ errorMessage }),
}));

export function resolveCurrentNewsItem(
  queue: NewsItem[],
  cursor: number,
  skippedIds: string[],
  ingestedIds: string[],
): NewsItem | null {
  for (let index = cursor; index < queue.length; index += 1) {
    const item = queue[index];
    if (skippedIds.includes(item.id) || ingestedIds.includes(item.id)) {
      continue;
    }
    return item;
  }
  return null;
}

export function isNewsSessionComplete(
  queue: NewsItem[],
  skippedIds: string[],
  ingestedIds: string[],
): boolean {
  return queue.every(
    (item) => skippedIds.includes(item.id) || ingestedIds.includes(item.id),
  );
}
