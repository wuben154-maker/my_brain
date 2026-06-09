/** Structured learning events — no raw audio or full transcripts (KOS-C1). */

export type LearningEventKind =
  | "briefing_skip"
  | "briefing_elaborate"
  | "briefing_ingest"
  | "node_review"
  | "teaching_followup";

export interface LearningTraceMetadata {
  worldItemId?: string;
  nodeId?: string;
  depth?: number;
  topic?: string;
}

export interface LearningTrace {
  id: string;
  conceptRef: string;
  kind: LearningEventKind;
  at: string;
  sessionId: string;
  metadata: LearningTraceMetadata;
}

export interface LearningTraceInput {
  conceptRef: string;
  kind: LearningEventKind;
  sessionId: string;
  at?: string;
  metadata?: LearningTraceMetadata;
}

const PENDING_PREFIX = "pending:";

/** Metadata keys that must never be persisted on a trace row. */
export const FORBIDDEN_TRACE_METADATA_KEYS = [
  "transcript",
  "audio",
  "audioUrl",
  "fullTranscript",
  "fullArticle",
  "rawArticle",
] as const;

export function formatPendingConceptRef(title: string): string {
  return `${PENDING_PREFIX}${title.trim()}`;
}

export function isPendingConceptRef(conceptRef: string): boolean {
  return conceptRef.startsWith(PENDING_PREFIX);
}

export function parsePendingConceptTitle(conceptRef: string): string | null {
  if (!isPendingConceptRef(conceptRef)) {
    return null;
  }
  return conceptRef.slice(PENDING_PREFIX.length);
}

export function serializeLearningTraceMetadata(
  metadata: LearningTraceMetadata,
): string {
  return JSON.stringify(metadata);
}

export function parseLearningTraceMetadata(
  json: string,
): LearningTraceMetadata {
  if (!json.trim()) {
    return {};
  }
  const parsed = JSON.parse(json) as Record<string, unknown>;
  const metadata: LearningTraceMetadata = {};
  if (typeof parsed.worldItemId === "string") {
    metadata.worldItemId = parsed.worldItemId;
  }
  if (typeof parsed.nodeId === "string") {
    metadata.nodeId = parsed.nodeId;
  }
  if (typeof parsed.depth === "number" && Number.isFinite(parsed.depth)) {
    metadata.depth = parsed.depth;
  }
  if (typeof parsed.topic === "string") {
    metadata.topic = parsed.topic;
  }
  return metadata;
}

export function assertLearningTraceMetadataSafe(
  metadata: LearningTraceMetadata,
): void {
  const record = metadata as Record<string, unknown>;
  for (const key of FORBIDDEN_TRACE_METADATA_KEYS) {
    if (key in record) {
      throw new Error(`LearningTrace metadata must not include ${key}`);
    }
  }
}

/** Golden replay expectations for showcase briefing script (KOS-C1 §3.2). */
export const LEARNING_TRACE_FIXTURES: Array<{
  kind: LearningEventKind;
  conceptRef: string;
  metadata: LearningTraceMetadata;
}> = [
  {
    kind: "briefing_skip",
    conceptRef: formatPendingConceptRef("OpenAI Realtime API 更新"),
    metadata: {
      worldItemId: "showcase-brief-1",
    },
  },
  {
    kind: "briefing_elaborate",
    conceptRef: formatPendingConceptRef("voice-agent-starter"),
    metadata: {
      worldItemId: "showcase-brief-2",
      depth: 1,
    },
  },
  {
    kind: "briefing_ingest",
    conceptRef: "showcase-ingest-graphiti",
    metadata: {
      worldItemId: "showcase-brief-3",
      nodeId: "showcase-ingest-graphiti",
    },
  },
];
