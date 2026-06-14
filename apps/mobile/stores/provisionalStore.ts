import { create } from "zustand";

import type { ProvisionalCandidate } from "@my-brain/core";
import {
  addCandidate,
  confirmCandidate,
  createProvisionalCandidate,
  explainCandidate,
  listPendingCandidates,
  rejectCandidate,
} from "@my-brain/core";

import { useMobileAppStore } from "./mobileAppStore";

export interface ProvisionalStoreState {
  candidates: ProvisionalCandidate[];
  lastExplanation: string | null;
  addTextCapture: (text: string) => ProvisionalCandidate;
  addLinkFixture: (summary: string, linkUrl: string) => ProvisionalCandidate;
  listPending: () => ProvisionalCandidate[];
  confirm: (id: string) => { nodeId: string; autoCurateSummary: string } | null;
  reject: (id: string) => void;
  explain: (id: string) => string;
}

export const useProvisionalStore = create<ProvisionalStoreState>((set, get) => ({
  candidates: [],
  lastExplanation: null,
  addTextCapture: (text) => {
    const candidate = createProvisionalCandidate({
      sourceType: "text",
      summary: text,
    });
    set((s) => ({ candidates: addCandidate(s.candidates, candidate) }));
    useMobileAppStore.getState().flushPersist();
    return candidate;
  },
  addLinkFixture: (summary, linkUrl) => {
    const candidate = createProvisionalCandidate({
      sourceType: "link",
      summary,
      linkUrl,
      evidenceRefs: [linkUrl],
    });
    set((s) => ({ candidates: addCandidate(s.candidates, candidate) }));
    useMobileAppStore.getState().flushPersist();
    return candidate;
  },
  listPending: () => listPendingCandidates(get().candidates),
  confirm: (id) => {
    const app = useMobileAppStore.getState();
    try {
      const result = confirmCandidate(get().candidates, id, {
        graph: app.graph,
        history: app.history,
      });
      set({ candidates: result.queue });
      app.syncGraphView();
      app.setLastIngestSummary(result.autoCurateSummary);
      app.flushPersist();
      return { nodeId: result.nodeId, autoCurateSummary: result.autoCurateSummary };
    } catch {
      return null;
    }
  },
  reject: (id) => {
    set((s) => ({ candidates: rejectCandidate(s.candidates, id) }));
    useMobileAppStore.getState().flushPersist();
  },
  explain: (id) => {
    const { queue, explanation } = explainCandidate(get().candidates, id);
    set({ candidates: queue, lastExplanation: explanation });
    return explanation;
  },
}));
