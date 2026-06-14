import type { MobilePersistedBundle } from "@my-brain/core";
import {
  InMemoryGraphRepository,
  InMemoryHistoryRepository,
  createDefaultDegradedState,
  createEmptyCorrectionState,
  generateAdaptiveSignals,
  buildMemoryWeatherV0,
} from "@my-brain/core";

import { useMobileAppStore } from "./mobileAppStore";
import { useProvisionalStore } from "./provisionalStore";
import { getStorageSession } from "../storage/storageSession";

function visibleFromGraph(graph: InMemoryGraphRepository) {
  return graph.getSnapshot().nodes.filter((n) => !n.archived).slice(0, 80);
}

export function hydrateMobileStores(bundle: MobilePersistedBundle, hasApiKey: boolean): void {
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

  useMobileAppStore.setState({
    phase: bundle.coldStartComplete ? "adaptive_live" : "empty_invite",
    coldStartComplete: bundle.coldStartComplete,
    userProfile: profile,
    correctionState,
    signals,
    graph,
    history,
    visibleNodes: visibleFromGraph(graph),
    weatherHeadline: profile
      ? buildMemoryWeatherV0(profile, graph.countVisibleNodes()).headline
      : "",
    degraded: createDefaultDegradedState(hasApiKey),
    storageReady: true,
    pendingIngestProposal: bundle.pendingIngest,
    providerStatus: bundle.providerConfig,
    persistWarnings: [],
  });

  useProvisionalStore.setState({
    candidates: bundle.provisional,
    lastExplanation: null,
  });
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
  if (state.pendingIngestProposal) {
    session.storage.savePendingIngestProposal(state.pendingIngestProposal);
  } else {
    session.storage.savePendingIngestProposal(null);
  }
  session.storage.saveProviderConfig(state.providerStatus);
}
