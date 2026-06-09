import type { LearningTrace } from "@/domain/learning/learningTrace";
import {
  isPendingConceptRef,
  parseLearningTraceMetadata,
  parsePendingConceptTitle,
} from "@/domain/learning/learningTrace";
import type { StorageProvider } from "@/storage/types";

let currentSessionId = `session-${Date.now()}`;

/** Volatile session id for trace grouping (app-layer, not MemoryProvider). */
export function getLearningSessionId(): string {
  return currentSessionId;
}

export function resetLearningSessionId(sessionId?: string): void {
  currentSessionId = sessionId ?? `session-${Date.now()}`;
}

export class LearningTraceStore {
  private traces: LearningTrace[] = [];
  private loaded = false;
  private persistWarning = false;

  getPersistWarning(): boolean {
    return this.persistWarning;
  }

  clear(): void {
    this.traces = [];
    this.loaded = false;
    this.persistWarning = false;
  }

  async load(storage: StorageProvider): Promise<void> {
    const rows = await storage.listLearningTraces();
    this.traces = rows;
    this.loaded = true;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  listAll(): LearningTrace[] {
    return [...this.traces].sort((a, b) => a.at.localeCompare(b.at));
  }

  listTracesForConcept(conceptId: string): LearningTrace[] {
    return this.traces
      .filter((trace) => trace.conceptRef === conceptId && !isPendingConceptRef(trace.conceptRef))
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  listTracesForPendingRef(pendingRef: string): LearningTrace[] {
    const normalized = pendingRef.startsWith("pending:")
      ? pendingRef
      : `pending:${pendingRef}`;
    return this.traces
      .filter((trace) => trace.conceptRef === normalized)
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  listTracesForSession(sessionId: string): LearningTrace[] {
    return this.traces
      .filter((trace) => trace.sessionId === sessionId)
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  async append(
    storage: StorageProvider | null,
    trace: LearningTrace,
  ): Promise<void> {
    this.traces.push(trace);
    if (!storage) {
      this.persistWarning = true;
      return;
    }
    try {
      await storage.saveLearningTrace(trace);
    } catch {
      this.persistWarning = true;
    }
  }

  hasRecentDuplicate(
    input: Pick<LearningTrace, "sessionId" | "kind" | "metadata">,
    atMs: number,
    windowMs: number,
  ): boolean {
    const worldItemId = input.metadata.worldItemId;
    if (!worldItemId) {
      return false;
    }
    const cutoff = atMs - windowMs;
    return this.traces.some((trace) => {
      if (trace.sessionId !== input.sessionId || trace.kind !== input.kind) {
        return false;
      }
      if (trace.metadata.worldItemId !== worldItemId) {
        return false;
      }
      const traceMs = Date.parse(trace.at);
      return Number.isFinite(traceMs) && traceMs >= cutoff;
    });
  }
}

export const learningTraceStore = new LearningTraceStore();

export function mapStoredLearningTraceRow(row: {
  id: string;
  conceptRef: string;
  kind: LearningTrace["kind"];
  at: string;
  sessionId: string;
  metadataJson: string;
}): LearningTrace {
  return {
    id: row.id,
    conceptRef: row.conceptRef,
    kind: row.kind,
    at: row.at,
    sessionId: row.sessionId,
    metadata: parseLearningTraceMetadata(row.metadataJson),
  };
}

export function pendingTitleFromRef(ref: string): string | null {
  return parsePendingConceptTitle(ref);
}
