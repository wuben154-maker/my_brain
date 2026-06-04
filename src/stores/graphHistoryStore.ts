import { create } from "zustand";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import type { BrainGraphSnapshot } from "@/domain/graph";
import { persistGraphSnapshot } from "@/lib/graphMutations";
import { syncDisplayGraph } from "@/lib/syncDisplayGraph";
import type { StorageProvider } from "@/storage/types";
import { useGraphStore } from "@/stores/graphStore";

interface GraphHistoryState {
  entries: GraphHistoryEntry[];
  loaded: boolean;
  load: (storage: StorageProvider) => Promise<void>;
  record: (storage: StorageProvider, entry: GraphHistoryEntry) => Promise<void>;
  undo: (
    storage: StorageProvider,
    mutationId: string,
  ) => Promise<BrainGraphSnapshot>;
  clear: () => void;
}

export const useGraphHistoryStore = create<GraphHistoryState>((set, get) => ({
  entries: [],
  loaded: false,
  load: async (storage) => {
    const rows = await storage.listGraphHistory();
    set({ entries: rows, loaded: true });
  },
  record: async (storage, entry) => {
    await storage.saveGraphHistoryEntry(entry);
    set((state) => ({ entries: [entry, ...state.entries] }));
  },
  undo: async (storage, mutationId) => {
    const entry = get().entries.find((row) => row.id === mutationId);
    if (!entry || entry.undone) {
      throw new Error(`Graph history entry not found: ${mutationId}`);
    }
    const current = await storage.loadGraph();
    await persistGraphSnapshot(storage, current, entry.before);
    await storage.setGraphHistoryUndone(mutationId);
    await syncDisplayGraph(storage);
    const snapshot = await storage.loadGraphForDisplay();
    useGraphStore.getState().setGraph(snapshot);
    set((state) => ({
      entries: state.entries.map((row) =>
        row.id === mutationId ? { ...row, undone: true } : row,
      ),
    }));
    return entry.before;
  },
  clear: () => {
    set({ entries: [], loaded: false });
  },
}));
