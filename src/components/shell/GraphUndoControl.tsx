import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { useGraphHistoryStore } from "@/stores/graphHistoryStore";

/** Minimal undo control for auto-curation graph history (invariant #3). */
export function GraphUndoControl() {
  const storage = useAppStore((state) => state.storage);
  const entries = useGraphHistoryStore((state) => state.entries);
  const loaded = useGraphHistoryStore((state) => state.loaded);
  const load = useGraphHistoryStore((state) => state.load);
  const undo = useGraphHistoryStore((state) => state.undo);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!storage || loaded) {
      return;
    }
    void load(storage);
  }, [storage, loaded, load]);

  const undoable = entries.find((entry) => !entry.undone);

  const onUndo = useCallback(async () => {
    if (!storage || !undoable || busy) {
      return;
    }
    setBusy(true);
    try {
      await undo(storage, undoable.id);
    } finally {
      setBusy(false);
    }
  }, [storage, undoable, busy, undo]);

  if (!undoable) {
    return null;
  }

  return (
    <button
      type="button"
      data-testid="graph-undo-control"
      aria-label="撤销最近一次图谱整理"
      disabled={busy}
      onClick={() => void onUndo()}
      className="rounded-full border border-hud bg-bg-elevated/80 px-3 py-1.5 text-caption text-secondary backdrop-blur-md transition hover:border-accent-cyan/50 hover:text-primary disabled:opacity-50"
    >
      撤销
    </button>
  );
}
