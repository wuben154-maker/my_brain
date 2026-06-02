import { createGraphDemoSnapshot } from "@/lib/graphDemoSeed";
import {
  VISUAL_BOOT_CHECKS,
  VISUAL_BOOT_LOGS,
  VISUAL_BOOT_PROGRESS,
  VISUAL_INBOX_ENVELOPE,
} from "@/lib/visualSnapshotFixtures";
import { useAgentInboxStore } from "@/stores/agentInboxStore";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";
import { useProposalStore } from "@/stores/proposalStore";

export type VisualSnapshotId = "boot" | "main" | "inbox";

export function readVisualSnapshotId(): VisualSnapshotId | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get("visual");
  if (value === "boot" || value === "main" || value === "inbox") {
    return value;
  }
  return null;
}

export function isVisualSnapshotMode(): boolean {
  return readVisualSnapshotId() !== null;
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
    useAppStore.getState().setPhase("ready");
    useGraphStore.getState().setGraph(createGraphDemoSnapshot());
    useProposalStore.setState({ pending: [VISUAL_INBOX_ENVELOPE] });
    useAgentInboxStore.getState().setInboxOpen(true);
    document.documentElement.dataset.visualInboxReady = "true";
    return;
  }

  useGraphStore.getState().setGraph(createGraphDemoSnapshot());
  useAppStore.getState().setPhase("ready");
}
