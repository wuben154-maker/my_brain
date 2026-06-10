import type { BrainGraphSnapshot } from "@/domain/graph";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import {
  persistGraphHistoryUndoSnapshot,
  persistGraphSnapshot,
} from "@/lib/graphMutations";
import type { StorageProvider } from "@/storage/types";

/**
 * KP-07: mutation paths that MUST co-persist graph + history (or verified undo).
 * Graph-only writes (ingest create, proposal approve, manual ops) are excluded.
 */
export const MUST_CO_TRANSACT_MUTATION_PATHS = [
  "runAutoCurateAfterIngest",
  "graphHistoryStore.undo",
] as const;

export type MustCoTransactMutationPath =
  (typeof MUST_CO_TRANSACT_MUTATION_PATHS)[number];

export class StorageCoTransactionError extends Error {
  readonly phase: "graph" | "history" | "undo";
  readonly recovered: boolean;

  constructor(
    message: string,
    phase: "graph" | "history" | "undo",
    recovered: boolean,
  ) {
    super(message);
    this.name = "StorageCoTransactionError";
    this.phase = phase;
    this.recovered = recovered;
  }
}

/** Restore persisted graph to `target` from whatever is currently stored. */
export async function recoverGraphToSnapshot(
  storage: StorageProvider,
  target: BrainGraphSnapshot,
): Promise<void> {
  const current = await storage.loadGraphForDisplay();
  await persistGraphSnapshot(storage, current, target);
}

/**
 * Persist graph delta with rollback to `before` when any write throws.
 * Prevents silent half-write during multi-step persistGraphSnapshot.
 */
export async function persistGraphSnapshotSafe(
  storage: StorageProvider,
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
): Promise<void> {
  try {
    await persistGraphSnapshot(storage, before, after);
  } catch (error) {
    try {
      await recoverGraphToSnapshot(storage, before);
    } catch {
      throw new StorageCoTransactionError(
        error instanceof Error ? error.message : "graph persist failed",
        "graph",
        false,
      );
    }
    throw new StorageCoTransactionError(
      error instanceof Error ? error.message : "graph persist failed",
      "graph",
      true,
    );
  }
}

/** Atomically persist graph mutation + history entry, rolling back graph on history failure. */
export async function coTransactGraphAndHistory(
  storage: StorageProvider,
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
  historyEntry: GraphHistoryEntry,
): Promise<void> {
  if (storage.runInTransaction) {
    try {
      await storage.runInTransaction(async () => {
        await persistGraphSnapshot(storage, before, after);
        await storage.saveGraphHistoryEntry(historyEntry);
      });
    } catch (error) {
      throw new StorageCoTransactionError(
        error instanceof Error ? error.message : "co-transact failed",
        "history",
        true,
      );
    }
    return;
  }

  let graphWritten = false;
  try {
    await persistGraphSnapshotSafe(storage, before, after);
    graphWritten = true;
    await storage.saveGraphHistoryEntry(historyEntry);
  } catch (error) {
    if (graphWritten && !(error instanceof StorageCoTransactionError)) {
      try {
        await recoverGraphToSnapshot(storage, before);
      } catch {
        throw new StorageCoTransactionError(
          error instanceof Error ? error.message : "history persist failed",
          "history",
          false,
        );
      }
      throw new StorageCoTransactionError(
        error instanceof Error ? error.message : "history persist failed",
        "history",
        true,
      );
    }
    throw error;
  }
}

/** Undo graph to entry.before and mark history undone; rolls back graph if flag write fails. */
export async function coTransactGraphUndo(
  storage: StorageProvider,
  current: BrainGraphSnapshot,
  entry: GraphHistoryEntry,
): Promise<void> {
  if (storage.runInTransaction) {
    try {
      await storage.runInTransaction(async () => {
        await persistGraphHistoryUndoSnapshot(
          storage,
          current,
          entry.before,
          entry.after,
        );
        await storage.setGraphHistoryUndone(entry.id);
      });
    } catch (error) {
      throw new StorageCoTransactionError(
        error instanceof Error ? error.message : "undo co-transact failed",
        "undo",
        true,
      );
    }
    return;
  }

  let graphUndone = false;
  try {
    await persistGraphHistoryUndoSnapshot(
      storage,
      current,
      entry.before,
      entry.after,
    );
    graphUndone = true;
    await storage.setGraphHistoryUndone(entry.id);
  } catch (error) {
    if (graphUndone) {
      try {
        await recoverGraphToSnapshot(storage, entry.after);
      } catch {
        throw new StorageCoTransactionError(
          error instanceof Error ? error.message : "undo flag persist failed",
          "undo",
          false,
        );
      }
      throw new StorageCoTransactionError(
        error instanceof Error ? error.message : "undo flag persist failed",
        "undo",
        true,
      );
    }
    throw new StorageCoTransactionError(
      error instanceof Error ? error.message : "undo graph persist failed",
      "undo",
      true,
    );
  }
}
