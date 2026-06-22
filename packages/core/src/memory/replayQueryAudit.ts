/** Records data-access patterns during MemoryReplay for gate assertions. */

const FORBIDDEN_PATTERNS = [
  /SELECT\s+\*\s+FROM\s+nodes/i,
  /SELECT\s+.*\s+FROM\s+graph_nodes(?!\s+WHERE\s+id\s*=)/i,
  /getSnapshot\(\)\.nodes/,
  /loadGraphSnapshot/,
] as const;

export type ReplayQueryKind = "incremental_history" | "node_lookup_by_id";

export interface ReplayQueryEntry {
  kind: ReplayQueryKind;
  detail: string;
}

let activeLog: ReplayQueryEntry[] | null = null;

export function beginReplayQueryAudit(): void {
  activeLog = [];
}

export function endReplayQueryAudit(): ReplayQueryEntry[] {
  const log = activeLog ?? [];
  activeLog = null;
  return log;
}

export function recordReplayQuery(kind: ReplayQueryKind, detail: string): void {
  if (!activeLog) {
    return;
  }
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(detail)) {
      throw new Error(`forbidden replay query: ${detail}`);
    }
  }
  activeLog.push({ kind, detail });
}

export function assertNoFullNodeScan(queries: ReplayQueryEntry[]): void {
  for (const entry of queries) {
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(entry.detail)) {
        throw new Error(`full node scan detected: ${entry.detail}`);
      }
    }
    if (entry.kind !== "incremental_history" && entry.kind !== "node_lookup_by_id") {
      throw new Error(`unexpected replay query kind: ${entry.kind}`);
    }
  }
  const hasIncremental = queries.some((q) => q.kind === "incremental_history");
  if (queries.length > 0 && !hasIncremental) {
    throw new Error("replay must use incremental_history reads");
  }
}
