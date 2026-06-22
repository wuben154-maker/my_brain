import type { GraphChangeRecord } from "../graph/types.js";
import { recordReplayQuery } from "./replayQueryAudit.js";
import { M5_REPLAY_BATCH_LIMIT } from "./types.js";

function changeSortKey(change: GraphChangeRecord): string {
  return `${change.createdAt}:${change.id}`;
}

export function listChangesAfterCursor(
  changes: GraphChangeRecord[],
  cursor: string | null,
  limit = M5_REPLAY_BATCH_LIMIT,
): GraphChangeRecord[] {
  const active = changes.filter((c) => !c.undone);
  recordReplayQuery(
    "incremental_history",
    `SELECT changes WHERE id > ${cursor ?? "null"} ORDER BY created_at LIMIT ${String(limit)}`,
  );

  if (!cursor) {
    return active
      .sort((a, b) => changeSortKey(a).localeCompare(changeSortKey(b)))
      .slice(-limit);
  }

  const cursorKey = cursor.includes(":") ? cursor : `:${cursor}`;
  return active
    .filter((c) => changeSortKey(c) > cursorKey)
    .sort((a, b) => changeSortKey(a).localeCompare(changeSortKey(b)))
    .slice(0, limit);
}

export function replayCursorFromChanges(changes: GraphChangeRecord[]): string | null {
  const active = changes.filter((c) => !c.undone);
  if (active.length === 0) {
    return null;
  }
  const last = active.reduce((acc, cur) =>
    changeSortKey(cur) > changeSortKey(acc) ? cur : acc,
  );
  return changeSortKey(last);
}
