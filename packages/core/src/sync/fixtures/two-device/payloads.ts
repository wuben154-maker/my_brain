import type { GraphSnapshot } from "../../../graph/types.js";
import type { SyncPayload } from "../../types.js";
import { buildSyncManifest } from "../../manifest.js";

export const DEVICE_A_ID = "fixture-device-a";
export const DEVICE_B_ID = "fixture-device-b";

export function deviceAGraph(): GraphSnapshot {
  return {
    nodes: [
      {
        id: "a-confirmed",
        concept: "闭包",
        intro: "A 端确认",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-10T08:00:00.000Z",
        confirmedAt: "2026-06-10T08:05:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
      {
        id: "a-shared",
        concept: "共享概念",
        intro: "双端都有",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-11T08:00:00.000Z",
        confirmedAt: "2026-06-11T08:01:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
    ],
    edges: [],
  };
}

export function deviceBGraph(): GraphSnapshot {
  return {
    nodes: [
      {
        id: "a-shared",
        concept: "共享概念",
        intro: "B 端更新",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-11T08:00:00.000Z",
        confirmedAt: "2026-06-11T09:00:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
      {
        id: "b-unconfirmed",
        concept: "远端未确认",
        intro: "必须进 provisional",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-12T08:00:00.000Z",
      },
      {
        id: "b-deleted",
        concept: "B 端删除意图",
        intro: "应 archive 不 hard delete",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-09T08:00:00.000Z",
        confirmedAt: "2026-06-09T08:01:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
    ],
    edges: [],
  };
}

export function minimalSyncPayload(
  deviceId: string,
  graph: GraphSnapshot,
  overrides: Partial<SyncPayload> = {},
): SyncPayload {
  const exportedAt = "2026-06-15T12:00:00.000Z";
  return {
    sync_manifest: buildSyncManifest({ exportedAt, deviceId }),
    graph_snapshot: graph,
    graph_history: overrides.graph_history ?? [],
    user_mode_profile: overrides.user_mode_profile ?? {
      profile: {
        primaryMode: "learner",
        secondaryModes: [],
        confidence: 0.8,
      },
      coldStartComplete: true,
    },
    profile_correction_history: overrides.profile_correction_history ?? [],
    profile_suppression_list: overrides.profile_suppression_list ?? [],
    profile_traits: overrides.profile_traits ?? [],
    learning_trace: overrides.learning_trace ?? [
      { id: "lt-fixture", topic: "TS", note: "fixture", createdAt: exportedAt },
    ],
    provisional_queue: overrides.provisional_queue ?? [],
    world_items: overrides.world_items ?? [
      { id: "wi-fixture", title: "Fixture", freshness: 0.5, updatedAt: exportedAt },
    ],
    adaptive_radar_state: overrides.adaptive_radar_state ?? {
      signals: [],
      cursor: { offset: 0 },
    },
    ...overrides,
  };
}
