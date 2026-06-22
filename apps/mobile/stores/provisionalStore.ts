import { create } from "zustand";

import type { ProvisionalCandidate, ProvisionalSourceType } from "@my-brain/core";
import {
  addCandidate,
  captureShareLink,
  confirmCandidate,
  createProvisionalCandidate,
  assertSaveIntentCreatesCandidateOnly,
  createAssetCandidateFromChatSave,
  explainCandidate,
  getSharePayloadFixture,
  listPendingCandidates,
  rejectCandidate,
  ssrfRejectUserHint,
  validateUrlAllowlist,
} from "@my-brain/core";

import { getMobileUrlGuard } from "../capture/guardedCapture";
import {
  intakeSharePayloadFixture,
  type ShareFixtureIntakeDiagnostic,
} from "../capture/shareFixtureIntake";
import {
  consumeNativeShareHandoffQueue,
  type NativeShareHandoffConsumeResult,
} from "../capture/nativeShareHandoff";
import { intakeSharePayload } from "../capture/shareIntake";
import { useMobileAppStore } from "./mobileAppStore";

export interface ProvisionalStoreState {
  candidates: ProvisionalCandidate[];
  lastExplanation: string | null;
  lastSsrfHint: string | null;
  lastShareIntakeDiagnostic: ShareFixtureIntakeDiagnostic | null;
  setShareIntakeDiagnostic: (diagnostic: ShareFixtureIntakeDiagnostic) => void;
  addTextCapture: (text: string, sourceType?: ProvisionalSourceType) => ProvisionalCandidate;
  addChatSaveCandidate: (
    chat: import("@my-brain/core").EphemeralConversationState,
    userText: string,
  ) => ProvisionalCandidate;
  addLinkFixture: (summary: string, linkUrl: string) => ProvisionalCandidate;
  addLinkCapture: (summary: string, linkUrl: string) => Promise<ProvisionalCandidate>;
  addShareIntake: (raw: unknown) => Promise<ProvisionalCandidate | null>;
  injectShareFixture: (fixtureId: string) => Promise<ShareFixtureIntakeDiagnostic>;
  injectSharePayloadRaw: (
    raw: unknown,
    fixtureId?: string,
  ) => Promise<ShareFixtureIntakeDiagnostic>;
  /** Drain Android intent / iOS App Group queue into provisional store (device path PENDING_DEVICE). */
  drainNativeShareHandoffQueue: () => Promise<NativeShareHandoffConsumeResult>;
  listPending: () => ProvisionalCandidate[];
  confirm: (id: string) => { nodeId: string; autoCurateSummary: string } | null;
  reject: (id: string) => void;
  explain: (id: string) => string;
}

export const useProvisionalStore = create<ProvisionalStoreState>((set, get) => ({
  candidates: [],
  lastExplanation: null,
  lastSsrfHint: null,
  lastShareIntakeDiagnostic: null,
  setShareIntakeDiagnostic: (diagnostic) => {
    set({ lastShareIntakeDiagnostic: diagnostic });
  },
  addTextCapture: (text, sourceType = "text") => {
    const candidate = createProvisionalCandidate({
      sourceType,
      summary: text,
    });
    set((s) => ({ candidates: addCandidate(s.candidates, candidate), lastSsrfHint: null }));
    useMobileAppStore.getState().flushPersist();
    return candidate;
  },
  addChatSaveCandidate: (chat, userText) => {
    const graph = useMobileAppStore.getState().graph;
    const before = graph.countVisibleNodes();
    const candidate = createAssetCandidateFromChatSave(chat, userText);
    assertSaveIntentCreatesCandidateOnly(graph, before, candidate);
    set((s) => ({ candidates: addCandidate(s.candidates, candidate), lastSsrfHint: null }));
    useMobileAppStore.getState().openAssetCandidate(candidate.id);
    useMobileAppStore.getState().flushPersist();
    return candidate;
  },
  addLinkFixture: (summary, linkUrl) => {
    const allow = validateUrlAllowlist(linkUrl);
    if (!allow.ok) {
      const hint = ssrfRejectUserHint(allow.code);
      set({ lastSsrfHint: hint });
      throw new Error(hint ?? allow.code);
    }
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
      set({
        lastSsrfHint: result.hint,
        lastExplanation: null,
        lastShareIntakeDiagnostic: {
          fixtureId: "raw-intake",
          ok: false,
          code: result.code,
          hint: result.hint,
          graphNodeCount: app.graph.countVisibleNodes(),
        },
      });
      return null;
    }
    const hint =
      result.linkFetch && !result.linkFetch.ok && result.linkFetch.code
        ? ssrfRejectUserHint(result.linkFetch.code)
        : null;
    set((s) => ({
      candidates: addCandidate(s.candidates, result.candidate),
      lastSsrfHint: hint,
      lastShareIntakeDiagnostic: {
        fixtureId: "raw-intake",
        ok: true,
        candidateId: result.candidate.id,
        sourceType: result.candidate.sourceType,
        graphNodeCount: app.graph.countVisibleNodes(),
      },
    }));
    app.flushPersist();
    return result.candidate;
  },
  injectShareFixture: async (fixtureId) => {
    const app = useMobileAppStore.getState();
    const fixture = getSharePayloadFixture(fixtureId);
    if (!fixture) {
      const diagnostic: ShareFixtureIntakeDiagnostic = {
        fixtureId,
        ok: false,
        code: "SHARE_FIXTURE_UNKNOWN",
        hint: `未知 fixture：${fixtureId}`,
        graphNodeCount: app.graph.countVisibleNodes(),
      };
      set({ lastShareIntakeDiagnostic: diagnostic, lastSsrfHint: diagnostic.hint ?? null });
      return diagnostic;
    }

    if (
      fixture.expectIntake === "SHARE_INTAKE_VOICE_DISABLED" ||
      fixture.expectIntake === "safe_error_no_permanent"
    ) {
      const diagnostic = await intakeSharePayloadFixture(fixtureId, {
        graph: app.graph,
        urlGuard: getMobileUrlGuard(),
      });
      set({
        lastShareIntakeDiagnostic: diagnostic,
        lastSsrfHint: diagnostic.hint ?? null,
      });
      return diagnostic;
    }

    if (fixture.input === undefined) {
      const diagnostic: ShareFixtureIntakeDiagnostic = {
        fixtureId,
        ok: false,
        code: "SHARE_FIXTURE_NO_INPUT",
        hint: "fixture 缺少 input",
        graphNodeCount: app.graph.countVisibleNodes(),
      };
      set({ lastShareIntakeDiagnostic: diagnostic });
      return diagnostic;
    }

    await get().addShareIntake(fixture.input);
    const base = get().lastShareIntakeDiagnostic;
    const diagnostic: ShareFixtureIntakeDiagnostic = base
      ? { ...base, fixtureId }
      : {
          fixtureId,
          ok: false,
          code: "SHARE_PAYLOAD_INVALID",
          hint: "分享 intake 失败",
          graphNodeCount: app.graph.countVisibleNodes(),
        };
    set({ lastShareIntakeDiagnostic: diagnostic });
    return diagnostic;
  },
  injectSharePayloadRaw: async (raw, fixtureId = "custom-json") => {
    await get().addShareIntake(raw);
    const base = get().lastShareIntakeDiagnostic;
    const app = useMobileAppStore.getState();
    const diagnostic: ShareFixtureIntakeDiagnostic = base
      ? { ...base, fixtureId }
      : {
          fixtureId,
          ok: false,
          code: "SHARE_PAYLOAD_INVALID",
          hint: "分享 intake 失败",
          graphNodeCount: app.graph.countVisibleNodes(),
        };
    set({ lastShareIntakeDiagnostic: diagnostic });
    return diagnostic;
  },
  drainNativeShareHandoffQueue: async () => {
    const app = useMobileAppStore.getState();
    const consumed = await consumeNativeShareHandoffQueue({
      graph: app.graph,
      urlGuard: getMobileUrlGuard(),
    });
    let added = 0;
    for (const { record, intake } of consumed.results) {
      if (!intake.ok) {
        set({
          lastSsrfHint: intake.hint,
          lastShareIntakeDiagnostic: {
            fixtureId: `native-${record.source}`,
            ok: false,
            code: intake.code,
            hint: intake.hint,
            graphNodeCount: app.graph.countVisibleNodes(),
          },
        });
        continue;
      }
      set((s) => ({
        candidates: addCandidate(s.candidates, intake.candidate),
        lastSsrfHint:
          intake.linkFetch && !intake.linkFetch.ok && intake.linkFetch.code
            ? ssrfRejectUserHint(intake.linkFetch.code)
            : null,
        lastShareIntakeDiagnostic: {
          fixtureId: `native-${record.source}`,
          ok: true,
          candidateId: intake.candidate.id,
          sourceType: intake.candidate.sourceType,
          graphNodeCount: app.graph.countVisibleNodes(),
        },
      }));
      added += 1;
    }
    if (added > 0) {
      app.flushPersist();
      app.setQueueSheetOpen(true);
    }
    return consumed;
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

