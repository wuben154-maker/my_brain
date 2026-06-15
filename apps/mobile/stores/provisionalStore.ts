import { create } from "zustand";

import type { ProvisionalCandidate, ProvisionalSourceType } from "@my-brain/core";
import {
  addCandidate,
  captureShareLink,
  confirmCandidate,
  createProvisionalCandidate,
  explainCandidate,
  listPendingCandidates,
  rejectCandidate,
  ssrfRejectUserHint,
} from "@my-brain/core";

import { getMobileUrlGuard } from "../capture/guardedCapture";
import { intakeSharePayload } from "../capture/shareIntake";
import { useMobileAppStore } from "./mobileAppStore";

export interface ProvisionalStoreState {
  candidates: ProvisionalCandidate[];
  lastExplanation: string | null;
  lastSsrfHint: string | null;
  addTextCapture: (text: string, sourceType?: ProvisionalSourceType) => ProvisionalCandidate;
  addLinkFixture: (summary: string, linkUrl: string) => ProvisionalCandidate;
  addLinkCapture: (summary: string, linkUrl: string) => Promise<ProvisionalCandidate>;
  addShareIntake: (raw: unknown) => Promise<ProvisionalCandidate | null>;
  listPending: () => ProvisionalCandidate[];
  confirm: (id: string) => { nodeId: string; autoCurateSummary: string } | null;
  reject: (id: string) => void;
  explain: (id: string) => string;
}

export const useProvisionalStore = create<ProvisionalStoreState>((set, get) => ({
  candidates: [],
  lastExplanation: null,
  lastSsrfHint: null,
  addTextCapture: (text, sourceType = "text") => {
    const candidate = createProvisionalCandidate({
      sourceType,
      summary: text,
    });
    set((s) => ({ candidates: addCandidate(s.candidates, candidate), lastSsrfHint: null }));
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
    set((s) => ({ candidates: addCandidate(s.candidates, candidate), lastSsrfHint: null }));
    useMobileAppStore.getState().flushPersist();
    return candidate;
  },
  addLinkCapture: async (summary, linkUrl) => {
    const app = useMobileAppStore.getState();
    const { candidate, fetchResult } = await captureShareLink(
      { summary, linkUrl, sourceType: "link" },
      { graph: app.graph, urlGuard: getMobileUrlGuard() },
    );
    const hint =
      !fetchResult.ok && fetchResult.code
        ? ssrfRejectUserHint(fetchResult.code)
        : null;
    set((s) => ({
      candidates: addCandidate(s.candidates, candidate),
      lastSsrfHint: hint,
    }));
    app.flushPersist();
    return candidate;
  },
  addShareIntake: async (raw) => {
    const app = useMobileAppStore.getState();
    const result = await intakeSharePayload(raw, {
      graph: app.graph,
      urlGuard: getMobileUrlGuard(),
    });
    if (!result.ok) {
      set({ lastSsrfHint: result.hint, lastExplanation: null });
      return null;
    }
    const hint =
      result.linkFetch && !result.linkFetch.ok && result.linkFetch.code
        ? ssrfRejectUserHint(result.linkFetch.code)
        : null;
    set((s) => ({
      candidates: addCandidate(s.candidates, result.candidate),
      lastSsrfHint: hint,
    }));
    app.flushPersist();
    return result.candidate;
  },
  listPending: () => listPendingCandidates(get().candidates),
  confirm: (id) => {
    const app = useMobileAppStore.getState();
    try {
      const result = confirmCandidate(get().candidates, id, {
        graph: app.graph,
        history: app.history,
      });
      set({ candidates: result.queue, lastSsrfHint: null });
      app.syncGraphView();
      app.setLastIngestSummary(result.autoCurateSummary);
      app.flushPersist();
      return { nodeId: result.nodeId, autoCurateSummary: result.autoCurateSummary };
    } catch {
      return null;
    }
  },
  reject: (id) => {
    set((s) => ({ candidates: rejectCandidate(s.candidates, id), lastSsrfHint: null }));
    useMobileAppStore.getState().flushPersist();
  },
  explain: (id) => {
    const { queue, explanation } = explainCandidate(get().candidates, id);
    set({ candidates: queue, lastExplanation: explanation });
    return explanation;
  },
}));
