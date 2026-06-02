import { createGraphDemoSnapshot } from "@/lib/graphDemoSeed";
import {
  VISUAL_BOOT_CHECKS,
  VISUAL_BOOT_LOGS,
  VISUAL_BOOT_PROGRESS,
} from "@/lib/visualSnapshotFixtures";
import { useAppStore } from "@/stores/appStore";
import { useGraphStore } from "@/stores/graphStore";

export type VisualSnapshotId = "boot" | "main";

export function readVisualSnapshotId(): VisualSnapshotId | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get("visual");
  if (value === "boot" || value === "main") {
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

  useGraphStore.getState().setGraph(createGraphDemoSnapshot());
  useAppStore.getState().setPhase("ready");
}
