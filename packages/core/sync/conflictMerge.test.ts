import { describe, expect, it } from "vitest";

import {
  collectRemoteDeleteIntents,
  collectEdgeMigrationMap,
  mergeGraphHistory,
  mergeGraphSnapshots,
} from "../src/sync/conflictMerge.js";
import { deviceAGraph, deviceBGraph } from "../src/sync/fixtures/two-device/payloads.js";

describe("sync conflictMerge", () => {
  it("archives remote delete intent instead of hard deleting local nodes", () => {
    const local = {
      nodes: [
        {
          id: "b-deleted",
          concept: "本地保留",
          intro: "delete = archive",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-09T08:00:00.000Z",
          confirmedAt: "2026-06-09T08:01:00.000Z",
          ingestSource: "user_confirmed_ingest",
        },
      ],
      edges: [],
    };

    const merged = mergeGraphSnapshots({
      local,
      remote: deviceBGraph(),
      remoteDeviceId: "device-b",
      remoteDeletedNodeIds: ["b-deleted"],
    });

    const node = merged.merged.nodes.find((n) => n.id === "b-deleted");
    expect(node).toBeDefined();
    expect(node?.archived).toBe(true);
    expect(merged.merged.nodes.some((n) => n.id === "b-deleted" && !n.archived)).toBe(false);
    expect(merged.archivedNodeIds).toContain("b-deleted");
  });

  it("merges confirmed nodes from both devices without dropping local-only nodes", () => {
    const merged = mergeGraphSnapshots({
      local: deviceAGraph(),
      remote: deviceBGraph(),
      remoteDeviceId: "device-b",
    });

    expect(merged.merged.nodes.find((n) => n.id === "a-confirmed")).toBeDefined();
    expect(merged.merged.nodes.find((n) => n.id === "a-shared")).toBeDefined();
    expect(merged.provisionalFromRemote).toHaveLength(1);
    expect(merged.provisionalFromRemote[0]?.summary).toBe("远端未确认");
    expect(merged.merged.nodes.some((n) => n.id === "b-unconfirmed")).toBe(false);
  });

  it("merges graph history by id without losing records", () => {
    const local = [
      {
        id: "h-local",
        kind: "node_created" as const,
        summary: "local",
        before: { nodes: [], edges: [] },
        after: deviceAGraph(),
        createdAt: "2026-06-10T08:00:00.000Z",
        undone: false,
      },
    ];
    const remote = [
      {
        id: "h-remote",
        kind: "node_archived" as const,
        summary: "remote archive",
        before: deviceBGraph(),
        after: {
          ...deviceBGraph(),
          nodes: deviceBGraph().nodes.map((n) =>
            n.id === "b-deleted" ? { ...n, archived: true } : n,
          ),
        },
        createdAt: "2026-06-11T08:00:00.000Z",
        undone: false,
      },
    ];
    const merged = mergeGraphHistory(local, remote);
    expect(merged.map((h) => h.id).sort()).toEqual(["h-local", "h-remote"]);
  });

  it("collects archive intents from remote history", () => {
    const deleted = collectRemoteDeleteIntents([
      {
        id: "h-del",
        kind: "node_archived",
        summary: "archive",
        before: {
          nodes: [
            {
              id: "gone",
              concept: "x",
              intro: "y",
              sourceLinks: [],
              archived: false,
              createdAt: "2026-06-01T00:00:00.000Z",
              confirmedAt: "2026-06-01T00:01:00.000Z",
              ingestSource: "user_confirmed_ingest",
            },
          ],
          edges: [],
        },
        after: {
          nodes: [
            {
              id: "gone",
              concept: "x",
              intro: "y",
              sourceLinks: [],
              archived: true,
              createdAt: "2026-06-01T00:00:00.000Z",
              confirmedAt: "2026-06-01T00:01:00.000Z",
              ingestSource: "user_confirmed_ingest",
            },
          ],
          edges: [],
        },
        createdAt: "2026-06-02T00:00:00.000Z",
        undone: false,
      },
    ]);
    expect(deleted).toEqual(["gone"]);
  });

  it("migrates edges off archived nodes when history maps replaced ids", () => {
    const local = {
      nodes: [
        {
          id: "anchor",
          concept: "Anchor",
          intro: "stay",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-01T00:00:00.000Z",
          confirmedAt: "2026-06-01T00:01:00.000Z",
          ingestSource: "user_confirmed_ingest",
        },
        {
          id: "old-node",
          concept: "Old",
          intro: "replaced",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-02T00:00:00.000Z",
          confirmedAt: "2026-06-02T00:01:00.000Z",
          ingestSource: "user_confirmed_ingest",
        },
      ],
      edges: [
        {
          id: "e1",
          fromId: "anchor",
          toId: "old-node",
          relation: "related_to",
        },
      ],
    };

    const remote = {
      nodes: [
        {
          id: "new-node",
          concept: "New",
          intro: "successor",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-03T00:00:00.000Z",
          confirmedAt: "2026-06-03T00:01:00.000Z",
          ingestSource: "user_confirmed_ingest",
        },
        {
          id: "old-node",
          concept: "Old",
          intro: "replaced",
          sourceLinks: [],
          archived: true,
          createdAt: "2026-06-02T00:00:00.000Z",
          confirmedAt: "2026-06-02T00:01:00.000Z",
          ingestSource: "user_confirmed_ingest",
        },
      ],
      edges: [],
    };

    const history = [
      {
        id: "h-migrate",
        kind: "auto_curate_merge" as const,
        summary: "merge old into new",
        before: {
          nodes: [
            {
              id: "old-node",
              concept: "Old",
              intro: "replaced",
              sourceLinks: [],
              archived: false,
              createdAt: "2026-06-02T00:00:00.000Z",
              confirmedAt: "2026-06-02T00:01:00.000Z",
              ingestSource: "user_confirmed_ingest",
            },
          ],
          edges: [],
        },
        after: remote,
        createdAt: "2026-06-03T01:00:00.000Z",
        undone: false,
      },
    ];

    expect(collectEdgeMigrationMap(history).get("old-node")).toBe("new-node");

    const merged = mergeGraphSnapshots({
      local,
      remote,
      remoteDeviceId: "device-b",
      edgeMigrationHistory: history,
    });

    expect(merged.edgeMigrationsApplied).toBeGreaterThan(0);
    expect(merged.merged.edges.some((edge) => edge.toId === "new-node")).toBe(true);
    expect(merged.merged.edges.some((edge) => edge.toId === "old-node")).toBe(false);
  });
});
