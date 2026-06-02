import type { StorageProvider } from "@/storage/types";
import { useGraphStore } from "@/stores/graphStore";

/** Reload canvas snapshot including archived nodes (DESIGN §8). */
export async function syncDisplayGraph(storage: StorageProvider): Promise<void> {
  const snapshot = await storage.loadGraphForDisplay();
  useGraphStore.getState().setGraph(snapshot);
}
