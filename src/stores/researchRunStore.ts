import { create } from "zustand";
import type { AgentDigest, AgentTraceStep } from "@/agent/types";

/** Session-only research run metadata for insight partition (trace is not persisted). */
export interface ResearchRunRecord {
  runId: string;
  trace: AgentTraceStep[];
  digest: AgentDigest | null;
  finishedAt: string;
  topic?: string;
}

interface ResearchRunState {
  runs: ResearchRunRecord[];
  selectedRunId: string | null;
  addRun: (record: ResearchRunRecord) => void;
  selectRun: (runId: string | null) => void;
  reset: () => void;
}

export const useResearchRunStore = create<ResearchRunState>((set) => ({
  runs: [],
  selectedRunId: null,
  addRun: (record) =>
    set((state) => ({
      runs: [
        record,
        ...state.runs.filter((run) => run.runId !== record.runId),
      ].slice(0, 20),
      selectedRunId: record.runId,
    })),
  selectRun: (selectedRunId) => set({ selectedRunId }),
  reset: () => set({ runs: [], selectedRunId: null }),
}));
