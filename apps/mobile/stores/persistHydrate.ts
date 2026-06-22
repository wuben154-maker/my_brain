import type { GraphNode, MobilePersistedBundle } from "@my-brain/core";
import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  createEmptyCorrectionState,
  deriveDegradedFromProviderSnapshot,
  generateAdaptiveSignals,
} from "@my-brain/core";

import { buildMobileM5Experiences } from "../memory/buildExperiences";
import { wireM5CaptureBridge } from "../memory/m5CaptureBridge";
import { useMobileAppStore } from "./mobileAppStore";
import { useProvisionalStore } from "./provisionalStore";
import { getStorageSession } from "../storage/storageSession";

export function visibleNodesFromGraph(graph: InMemoryGraphRepository): GraphNode[] {
  return graph.getM5CandidateSnapshot().nodes;
}

export function hydrateMobileStores(
  bundle: MobilePersistedBundle,
  hasApiKey: boolean,
  demoMode = false,
): void {
  const graph = new InMemoryGraphRepository();
  graph.replaceSnapshot(bundle.graph);
  const history = new InMemoryHistoryRepository();
  for (const record of bundle.history) {
    history.pushChange(record);
  }

  const profile = bundle.profile;
  const correctionState =
    bundle.correctionState.traits.length > 0
      ? bundle.correctionState
      : profile
        ? { ...createEmptyCorrectionState(), traits: [] }
        : createEmptyCorrectionState();

  const signals =
    bundle.signals.length > 0 && profile
      ? bundle.signals
      : profile
        ? generateAdaptiveSignals(profile, correctionState.suppressionList)
        : [];

  const degraded = deriveDegradedFromProviderSnapshot(
    bundle.providerConfig,
    hasApiKey,
    bundle.coldStartComplete,
  );

  const { phase: currentPhase, storageReady: storageWasReady } = useMobileAppStore.getState();
  // Returning users enter main route immediately; first boot may show in-app launch once.
  const phase = bundle.coldStartComplete
    ? "adaptive_live"
    : currentPhase === "launch" && !storageWasReady
      ? "launch"
      : "empty_invite";

  useMobileAppStore.setState({
    phase,
    coldStartComplete: bundle.coldStartComplete,
    userProfile: profile,
    correctionState,
    signals,
    learningTraces: bundle.learningTraces,
    graph,
    history,
    visibleNodes: visibleNodesFromGraph(graph),
    m5Experiences: profile
      ? buildMobileM5Experiences({
          profile,
          graph,
          history,
          captures: bundle.provisional,
          learningTraces: bundle.learningTraces,
        })
      : null,
    replayCursor: null,
    degraded,
    storageReady: true,
    pendingIngestProposal: bundle.pendingIngest,
    providerStatus: bundle.providerConfig,
    persistWarnings: [],
    demoMode,
  });

  useProvisionalStore.setState({
    candidates: bundle.provisional,
    lastExplanation: null,
  });

  wireM5CaptureBridge();
}

export function persistMobileState(): void {
  const session = getStorageSession();
  if (!session) {
    return;
  }
  const state = useMobileAppStore.getState();
  const provisional = useProvisionalStore.getState();
  session.storage.saveGraphSnapshot(state.graph.getSnapshot());
  const changes = state.history.listChanges();
  for (const change of changes) {
    session.storage.saveHistoryEntry(change);
  }
  session.storage.saveUserModeProfile(state.userProfile, state.coldStartComplete);
  session.storage.saveCorrectionState(state.correctionState);
  session.storage.saveProvisionalCandidates(provisional.candidates);
  session.storage.saveAdaptiveSignals(state.signals);
  session.storage.saveLearningTraces(state.learningTraces);
  if (state.pendingIngestProposal) {
    session.storage.savePendingIngestProposal(state.pendingIngestProposal);
  } else {
    session.storage.savePendingIngestProposal(null);
  }
  session.storage.saveProviderConfig(state.providerStatus);
}
