import type { UserMode, UserModeProfile } from "../domain/userMode.js";
import type { GraphChangeRecord } from "../graph/types.js";
import { graphChangeRef, captureRef } from "./evidence.js";
import {
  listChangesAfterCursor,
  replayCursorFromChanges,
} from "./incrementalHistory.js";
import {
  beginReplayQueryAudit,
  endReplayQueryAudit,
} from "./replayQueryAudit.js";
import type {
  M5EvidenceBundle,
  MemoryReplayOutputKind,
  MemoryReplayResult,
} from "./types.js";
import { M5_REPLAY_DURATION_MS } from "./types.js";

function replayKindForMode(mode: UserMode): MemoryReplayOutputKind {
  const map: Record<UserMode, MemoryReplayOutputKind> = {
    tech_tracker: "ingest_timeline",
    learner: "learning_trace",
    creator_researcher: "capture_to_ingest",
    founder_project: "project_timeline",
    personal_memory: "life_capture",
  };
  return map[mode];
}

export function buildMemoryReplay(
  profile: UserModeProfile,
  bundle: M5EvidenceBundle,
  cursor: string | null = null,
): MemoryReplayResult {
  beginReplayQueryAudit();
  try {
    const changes = bundle.graphChanges;
    const incremental = listChangesAfterCursor(changes, cursor);

    if (incremental.length === 0 && bundle.captures.length === 0) {
      return {
        visible: false,
        outputKind: replayKindForMode(profile.primaryMode),
        frames: [],
        cursor: replayCursorFromChanges(changes),
        durationMs: M5_REPLAY_DURATION_MS,
      };
    }

    const outputKind = replayKindForMode(profile.primaryMode);
    const frames = incremental.map((change: GraphChangeRecord) => ({
      changeId: change.id,
      summary: change.summary,
      evidenceRefs: [graphChangeRef(change.id)],
      at: change.createdAt,
    }));

    if (frames.length === 0) {
      for (const capture of bundle.captures.filter((c) => c.status === "confirmed").slice(0, 3)) {
        frames.push({
          changeId: capture.id,
          summary: capture.summary,
          evidenceRefs: [captureRef(capture.id)],
          at: capture.createdAt,
        });
      }
    }

    if (frames.length === 0) {
      return {
        visible: false,
        outputKind,
        frames: [],
        cursor: replayCursorFromChanges(changes),
        durationMs: M5_REPLAY_DURATION_MS,
      };
    }

    return {
      visible: true,
      outputKind,
      frames,
      cursor: replayCursorFromChanges(changes),
      durationMs: M5_REPLAY_DURATION_MS,
    };
  } finally {
    endReplayQueryAudit();
  }
}

export function measureReplayColdStartMs(
  changes: GraphChangeRecord[],
  iterations = 20,
): { p50: number; samples: number[] } {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    beginReplayQueryAudit();
    try {
      listChangesAfterCursor(changes, null, 12);
    } finally {
      endReplayQueryAudit();
    }
    samples.push(performance.now() - start);
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const p50 = sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  return { p50, samples };
}
