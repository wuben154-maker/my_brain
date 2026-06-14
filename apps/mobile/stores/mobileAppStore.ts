import { create } from "zustand";

import type {
  AdaptiveSignal,
  ConversationState,
  DegradedModeState,
  GraphNode,
  ProfileCorrectionState,
  ProviderConfigSnapshot,
  UserModeProfile,
  PendingIngestProposal,
} from "@my-brain/core";
import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  applyCorrectionToProfile,
  applyProfileCorrection,
  buildMemoryWeatherV0,
  buildProviderStatusFromDegraded,
  createDefaultDegradedState,
  createEmptyCorrectionState,
  createInitialConversationState,
  generateAdaptiveSignals,
  seedTraitsFromProfile,
} from "@my-brain/core";

import { persistMobileState } from "./persistHydrate";

export type HomePhase = "launch" | "empty_invite" | "cold_start" | "adaptive_live";

export interface MobileAppState {
  phase: HomePhase;
  coldStartComplete: boolean;
  userProfile: UserModeProfile | null;
  signals: AdaptiveSignal[];
  correctionState: ProfileCorrectionState;
  degraded: DegradedModeState;
  conversation: ConversationState;
  graph: InMemoryGraphRepository;
  history: InMemoryHistoryRepository;
  visibleNodes: GraphNode[];
  weatherHeadline: string;
  lastIngestSummary: string | null;
  settingsOpen: boolean;
  profileReviewOpen: boolean;
  queueSheetOpen: boolean;
  hasApiKey: boolean;
  storageReady: boolean;
  pendingIngestProposal: PendingIngestProposal | null;
  providerStatus: ProviderConfigSnapshot;
  persistWarnings: Array<"history_persist_warning" | "learning_trace_persist_warning" | "storage_degraded">;
  setHasApiKey: (v: boolean) => void;
  openSettings: () => void;
  closeSettings: () => void;
  openProfileReview: () => void;
  closeProfileReview: () => void;
  setQueueSheetOpen: (v: boolean) => void;
  finishLaunch: () => void;
  startColdStart: () => void;
  completeColdStart: (profile: UserModeProfile) => void;
  refreshRadar: () => void;
  setConversation: (c: ConversationState) => void;
  syncGraphView: () => void;
  setLastIngestSummary: (s: string | null) => void;
  applyCorrection: (traitId: string, action: "suppress" | "restore") => void;
  setPendingIngestProposal: (p: PendingIngestProposal | null) => void;
  flushPersist: () => void;
  addPersistWarning: (code: MobileAppState["persistWarnings"][number]) => void;
}

function visibleFromGraph(graph: InMemoryGraphRepository): GraphNode[] {
  return graph.getSnapshot().nodes.filter((n) => !n.archived).slice(0, 80);
}

export const useMobileAppStore = create<MobileAppState>((set, get) => ({
  phase: "launch",
  coldStartComplete: false,
  userProfile: null,
  signals: [],
  correctionState: createEmptyCorrectionState(),
  degraded: createDefaultDegradedState(false),
  conversation: createInitialConversationState(),
  graph: new InMemoryGraphRepository(),
  history: new InMemoryHistoryRepository(),
  visibleNodes: [],
  weatherHeadline: "",
  lastIngestSummary: null,
  settingsOpen: false,
  profileReviewOpen: false,
  queueSheetOpen: false,
  hasApiKey: false,
  storageReady: false,
  pendingIngestProposal: null,
  providerStatus: {
    llm: "mock",
    radar: "fixture",
    voice: "disconnected",
    storage: "migrating",
  },
  persistWarnings: [],
  setHasApiKey: (v) => {
    const degraded = createDefaultDegradedState(v);
    set({
      hasApiKey: v,
      degraded,
      providerStatus: buildProviderStatusFromDegraded(degraded, get().providerStatus.storage),
    });
    get().flushPersist();
  },
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openProfileReview: () => set({ profileReviewOpen: true, settingsOpen: true }),
  closeProfileReview: () => set({ profileReviewOpen: false }),
  setQueueSheetOpen: (v) => set({ queueSheetOpen: v }),
  finishLaunch: () =>
    set((s) => ({
      phase: s.coldStartComplete ? "adaptive_live" : "empty_invite",
    })),
  startColdStart: () => set({ phase: "cold_start" }),
  completeColdStart: (profile) => {
    const correctionState = {
      ...createEmptyCorrectionState(),
      traits: seedTraitsFromProfile(profile),
    };
    const signals = generateAdaptiveSignals(profile, correctionState.suppressionList);
    const graph = get().graph;
    set({
      phase: "adaptive_live",
      coldStartComplete: true,
      userProfile: profile,
      correctionState,
      signals,
      visibleNodes: visibleFromGraph(graph),
      weatherHeadline: buildMemoryWeatherV0(profile, graph.countVisibleNodes()).headline,
    });
    get().flushPersist();
  },
  refreshRadar: () => {
    const { userProfile, correctionState, graph } = get();
    if (!userProfile) {
      return;
    }
    const corrected = applyCorrectionToProfile(userProfile, correctionState);
    set({
      userProfile: corrected,
      signals: generateAdaptiveSignals(corrected, correctionState.suppressionList),
      weatherHeadline: buildMemoryWeatherV0(corrected, graph.countVisibleNodes()).headline,
    });
  },
  setConversation: (c) => set({ conversation: c }),
  syncGraphView: () => {
    const { graph, userProfile } = get();
    set({
      visibleNodes: visibleFromGraph(graph),
      weatherHeadline: userProfile
        ? buildMemoryWeatherV0(userProfile, graph.countVisibleNodes()).headline
        : "",
    });
  },
  setLastIngestSummary: (s) => set({ lastIngestSummary: s }),
  applyCorrection: (traitId, action) => {
    const state = get();
    const correctionState = applyProfileCorrection(
      state.correctionState,
      traitId,
      action,
    );
    set({ correctionState });
    get().refreshRadar();
    get().flushPersist();
  },
  setPendingIngestProposal: (p) => {
    set({ pendingIngestProposal: p });
    get().flushPersist();
  },
  flushPersist: () => {
    if (!get().storageReady) {
      return;
    }
    const degraded = get().degraded;
    set({
      providerStatus: buildProviderStatusFromDegraded(
        degraded,
        get().persistWarnings.includes("storage_degraded") ? "degraded" : "ready",
      ),
    });
    persistMobileState();
  },
  addPersistWarning: (code) => {
    const warnings = get().persistWarnings;
    if (!warnings.includes(code)) {
      set({ persistWarnings: [...warnings, code] });
    }
  },
}));
