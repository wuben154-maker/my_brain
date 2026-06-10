import { create } from "zustand";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import type { BrainGraphSnapshot } from "@/domain/graph";
import { coTransactGraphUndo } from "@/storage/transaction";
import { syncDisplayGraph } from "@/lib/syncDisplayGraph";
import type { StorageProvider } from "@/storage/types";
import { useGraphStore } from "@/stores/graphStore";

interface GraphHistoryState {
  entries: GraphHistoryEntry[];
  loaded: boolean;
  /** Entry id for the auto-expanded curation report overlay (KOS-A3). */
  reportEntryId: string | null;
  historyPanelOpen: boolean;
  persistWarning: boolean;
  lastUndoError: string | null;
  load: (storage: StorageProvider) => Promise<void>;
  record: (
    storage: StorageProvider,
    entry: GraphHistoryEntry,
    options?: { skipPersist?: boolean },
  ) => Promise<void>;
  undo: (
    storage: StorageProvider,
    mutationId: string,
  ) => Promise<BrainGraphSnapshot | null>;
  openReport: (entryId: string) => void;
  dismissReport: () => void;
  setHistoryPanelOpen: (open: boolean) => void;
  clearUndoError: () => void;
  clear: () => void;
}

export const useGraphHistoryStore = create<GraphHistoryState>((set, get) => ({
  entries: [],
  loaded: false,
  reportEntryId: null,
  historyPanelOpen: false,
  persistWarning: false,
  lastUndoError: null,
  load: async (storage) => {
    const rows = await storage.listGraphHistory();
    set({ entries: rows, loaded: true });
  },
  record: async (storage, entry, options) => {
    let persistWarning = false;
    if (!options?.skipPersist) {
      try {
        await storage.saveGraphHistoryEntry(entry);
      } catch {
        persistWarning = true;
      }
    }
    set((state) => ({
      entries: [entry, ...state.entries],
      reportEntryId: entry.id,
      persistWarning: persistWarning || state.persistWarning,
      lastUndoError: null,
    }));
  },
  undo: async (storage, mutationId) => {
    const entry = get().entries.find((row) => row.id === mutationId);
    if (!entry || entry.undone) {
      set({ lastUndoError: "记录不存在" });
      return null;
    }
    const current = await storage.loadGraphForDisplay();
    await coTransactGraphUndo(storage, current, entry);
    await syncDisplayGraph(storage);
    const snapshot = await storage.loadGraphForDisplay();
    useGraphStore.getState().setGraph(snapshot);
    set((state) => ({
      entries: state.entries.map((row) =>
        row.id === mutationId ? { ...row, undone: true } : row,
      ),
      reportEntryId:
        state.reportEntryId === mutationId ? null : state.reportEntryId,
      lastUndoError: null,
    }));
    return snapshot;
  },
  openReport: (entryId) => {
    set({ reportEntryId: entryId, lastUndoError: null });
  },
  dismissReport: () => {
    set({ reportEntryId: null });
  },
  setHistoryPanelOpen: (open) => {
    set({ historyPanelOpen: open });
  },
  clearUndoError: () => {
    set({ lastUndoError: null });
  },
  clear: () => {
    set({
      entries: [],
      loaded: false,
      reportEntryId: null,
      historyPanelOpen: false,
      persistWarning: false,
      lastUndoError: null,
    });
  },
}));
