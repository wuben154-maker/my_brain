import { createGraphDemoSnapshot } from "@/lib/graphDemoSeed";
import { persistGraphSnapshot } from "@/lib/graphMutations";
import { createStorageProvider } from "@/storage/createStorageProvider";
import {
  VISUAL_BOOT_CHECKS,
  VISUAL_BOOT_LOGS,
  VISUAL_BOOT_PROGRESS,
  VISUAL_INBOX_ENVELOPE,
  VISUAL_INSIGHT_ENVELOPES,
  VISUAL_INSIGHT_RUN,
} from "@/lib/visualSnapshotFixtures";
import { useAgentInboxStore } from "@/stores/agentInboxStore";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";
import { useProposalStore } from "@/stores/proposalStore";
import { useResearchRunStore } from "@/stores/researchRunStore";
import { useUiStore } from "@/stores/uiStore";

export type VisualSnapshotId = "boot" | "main" | "companion" | "inbox" | "insight";

export function readVisualSnapshotId(): VisualSnapshotId | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get("visual");
  if (value === "main") {
    return "companion";
  }
  if (
    value === "boot" ||
    value === "companion" ||
    value === "inbox" ||
    value === "insight"
  ) {
    return value;
  }
  return null;
}

export function isVisualSnapshotMode(): boolean {
  return readVisualSnapshotId() !== null;
}

/** Seed dev SQLite for `?visual=inbox` so approve uses proposalStore, not memory-only graph. */
export async function bootstrapVisualInboxStorage(): Promise<void> {
  const storage = createStorageProvider();
  await storage.init();
  const graph = createGraphDemoSnapshot();
  await persistGraphSnapshot(storage, { nodes: [], edges: [] }, graph);
  await storage.saveProposal(VISUAL_INBOX_ENVELOPE);
  useAppStore.getState().setStorage(storage);
  await useProposalStore.getState().load(storage);
}

export function applyVisualSnapshot(id: VisualSnapshotId): void {
  document.documentElement.dataset.visualSnapshot = id;

  if (id === "boot") {
    const store = useAppStore.getState();
    store.resetBoot();
    store.setPhase("self_check");
    store.setSelfChecks([...VISUAL_BOOT_CHECKS]);
    store.setBootProgress(VISUAL_BOOT_PROGRESS);
    for (const line of VISUAL_BOOT_LOGS) {
      store.appendBootLog(line);
    }
    return;
  }

  if (id === "inbox") {
    useAppStore.getState().setPhase("companion");
    useGraphStore.getState().setGraph(createGraphDemoSnapshot());
    useProposalStore.setState({ pending: [VISUAL_INBOX_ENVELOPE] });
    useAgentInboxStore.getState().setInboxOpen(true);
    return;
  }

  if (id === "insight") {
    useAppStore.getState().setPhase("companion");
    useGraphStore.getState().setGraph(createGraphDemoSnapshot());
    useResearchRunStore.setState({
      runs: [VISUAL_INSIGHT_RUN],
      selectedRunId: VISUAL_INSIGHT_RUN.runId,
    });
    useProposalStore.setState({ pending: VISUAL_INSIGHT_ENVELOPES });
    useUiStore.getState().setSection("insight");
    document.documentElement.dataset.visualInsightReady = "true";
    return;
  }

  useGraphStore.getState().setGraph(createGraphDemoSnapshot());
  useAppStore.getState().setPhase("companion");
}
