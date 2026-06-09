import type { NewsItem } from "@/domain/news";
import {
  assertLearningTraceMetadataSafe,
  formatPendingConceptRef,
  type LearningEventKind,
  type LearningTrace,
  type LearningTraceInput,
  type LearningTraceMetadata,
} from "@/domain/learning/learningTrace";
import {
  getLearningSessionId,
  learningTraceStore,
} from "@/learning/learningTraceStore";
import type { StorageProvider } from "@/storage/types";

export const LEARNING_TRACE_DEDUP_WINDOW_MS = 5 * 60 * 1000;

let traceCounter = 0;

function nextTraceId(): string {
  traceCounter += 1;
  return `ltr-${Date.now()}-${traceCounter}`;
}

export function resetLearningTraceIdCounter(): void {
  traceCounter = 0;
}

export function validateLearningTraceInput(
  input: LearningTraceInput,
): LearningTrace {
  const conceptRef = input.conceptRef.trim();
  if (!conceptRef) {
    throw new Error("LearningTrace conceptRef is required");
  }
  if (!input.sessionId.trim()) {
    throw new Error("LearningTrace sessionId is required");
  }
  const metadata = input.metadata ?? {};
  assertLearningTraceMetadataSafe(metadata);
  return {
    id: nextTraceId(),
    conceptRef,
    kind: input.kind,
    at: input.at ?? new Date().toISOString(),
    sessionId: input.sessionId,
    metadata,
  };
}

export interface RecordLearningTraceOptions {
  storage?: StorageProvider | null;
  dedupeWindowMs?: number;
  skipDedupe?: boolean;
}

/**
 * Validate, dedupe (same session/kind/worldItem within window), persist with memory fallback.
 */
export async function recordLearningTrace(
  input: LearningTraceInput,
  options: RecordLearningTraceOptions = {},
): Promise<LearningTrace | null> {
  const trace = validateLearningTraceInput(input);
  const windowMs = options.dedupeWindowMs ?? LEARNING_TRACE_DEDUP_WINDOW_MS;
  const atMs = Date.parse(trace.at);

  if (
    !options.skipDedupe &&
    Number.isFinite(atMs) &&
    learningTraceStore.hasRecentDuplicate(trace, atMs, windowMs)
  ) {
    return null;
  }

  await learningTraceStore.append(options.storage ?? null, trace);
  return trace;
}

export async function recordBriefingSkipTrace(
  item: NewsItem,
  storage?: StorageProvider | null,
  sessionId: string = getLearningSessionId(),
): Promise<LearningTrace | null> {
  return recordLearningTrace(
    {
      conceptRef: formatPendingConceptRef(item.title),
      kind: "briefing_skip",
      sessionId,
      metadata: { worldItemId: item.id },
    },
    { storage },
  );
}

export async function recordBriefingElaborateTrace(
  item: NewsItem,
  depth: number,
  storage?: StorageProvider | null,
  sessionId: string = getLearningSessionId(),
): Promise<LearningTrace | null> {
  return recordLearningTrace(
    {
      conceptRef: formatPendingConceptRef(item.title),
      kind: "briefing_elaborate",
      sessionId,
      metadata: { worldItemId: item.id, depth },
    },
    { storage },
  );
}

export async function recordBriefingIngestTrace(
  item: NewsItem,
  nodeId: string,
  storage?: StorageProvider | null,
  sessionId: string = getLearningSessionId(),
): Promise<LearningTrace | null> {
  return recordLearningTrace(
    {
      conceptRef: nodeId,
      kind: "briefing_ingest",
      sessionId,
      metadata: { worldItemId: item.id, nodeId },
    },
    { storage },
  );
}

export async function recordTeachingFollowupTrace(
  topic: string,
  conceptRef: string,
  storage?: StorageProvider | null,
  sessionId: string = getLearningSessionId(),
): Promise<LearningTrace | null> {
  return recordLearningTrace(
    {
      conceptRef,
      kind: "teaching_followup",
      sessionId,
      metadata: { topic: topic.slice(0, 120) },
    },
    { storage },
  );
}

export async function recordNodeReviewTrace(
  nodeId: string,
  storage?: StorageProvider | null,
  sessionId: string = getLearningSessionId(),
): Promise<LearningTrace | null> {
  return recordLearningTrace(
    {
      conceptRef: nodeId,
      kind: "node_review",
      sessionId,
      metadata: { nodeId },
    },
    { storage },
  );
}

export type { LearningEventKind, LearningTraceMetadata };
