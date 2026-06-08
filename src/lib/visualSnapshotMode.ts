import { shouldEnableDemoModes } from "@/lib/devOnlyGuards";
import { createGraphDemoSnapshot } from "@/lib/graphDemoSeed";
import { createCompanionVisualGraphSnapshot } from "@/lib/visualSnapshotFixtures";
import { persistGraphSnapshot } from "@/lib/graphMutations";
import { createStorageProvider } from "@/storage/createStorageProvider";
import {
  VISUAL_BOOT_CHECKS,
  VISUAL_BOOT_LOGS,
  VISUAL_BOOT_PROGRESS,
  VISUAL_COMPANION_SELFCHECK_CHECKS,
  VISUAL_COMPANION_SELFCHECK_PROGRESS,
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

export type VisualSnapshotId =
  | "boot"
  | "companion-boot"
  | "companion-selfcheck"
  | "companion-main"
  | "companion"
  | "main"
  | "inbox"
  | "insight";

const VISUAL_SNAPSHOT_ALIASES: Record<string, VisualSnapshotId> = {
  main: "companion-main",
  companion: "companion-main",
};

export function normalizeVisualSnapshotId(
  value: string | null,
): VisualSnapshotId | null {
  if (!value) {
    return null;
  }
  if (value in VISUAL_SNAPSHOT_ALIASES) {
    return VISUAL_SNAPSHOT_ALIASES[value];
  }
  if (
    value === "boot" ||
    value === "companion-boot" ||
    value === "companion-selfcheck" ||
    value === "companion-main" ||
    value === "inbox" ||
    value === "insight"
  ) {
    return value;
  }
  return null;
}

export function readVisualSnapshotId(): VisualSnapshotId | null {
  if (!shouldEnableDemoModes()) {
    return null;
  }
  if (typeof window === "undefined") {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get("visual");
  return normalizeVisualSnapshotId(value);
}

export function isVisualSnapshotMode(): boolean {
  return readVisualSnapshotId() !== null;
}

/** True when the snapshot should pin the companion main graph layout. */
export function isCompanionMainVisualSnapshot(
  id: VisualSnapshotId | null = readVisualSnapshotId(),
): boolean {
  return id === "companion-main" || id === "companion" || id === "main";
}

/** Seed dev SQLite for `?visual=inbox` so approve uses proposalStore, not memory-only graph. */
export async function bootstrapVisualInboxStorage(): Promise<void> {
  if (!shouldEnableDemoModes()) {
    return;
  }
  const storage = createStorageProvider();
  await storage.init();
  const graph = createGraphDemoSnapshot();
  await persistGraphSnapshot(storage, { nodes: [], edges: [] }, graph);
  await storage.saveProposal(VISUAL_INBOX_ENVELOPE);
  useAppStore.getState().setStorage(storage);
  await useProposalStore.getState().load(storage);
}

export function applyVisualSnapshot(id: VisualSnapshotId): void {
  if (!shouldEnableDemoModes()) {
    return;
  }
  document.documentElement.dataset.visualSnapshot = id;

  if (id === "companion-boot") {
    // Boot intro removed — alias to self-check snapshot for legacy URLs.
    applyVisualSnapshot("companion-selfcheck");
    return;
  }

  if (id === "companion-selfcheck") {
    const store = useAppStore.getState();
    store.beginSelfCheckLaunch([...VISUAL_COMPANION_SELFCHECK_CHECKS]);
    store.setBootProgress(VISUAL_COMPANION_SELFCHECK_PROGRESS);
    store.appendBootLog("[BOOT] VOICE SYSTEM CHECK…");
    return;
  }

  if (id === "boot") {
    const store = useAppStore.getState();
    store.beginSelfCheckLaunch([...VISUAL_BOOT_CHECKS]);
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

  if (isCompanionMainVisualSnapshot(id)) {
    useGraphStore.getState().setGraph(createCompanionVisualGraphSnapshot());
    useAppStore.getState().setPhase("companion");
    return;
  }

  useGraphStore.getState().setGraph(createGraphDemoSnapshot());
  useAppStore.getState().setPhase("companion");
}
