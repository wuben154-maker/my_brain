import { describe, expect, it } from "vitest";

import { SYNC_REQUIRED_ENTITIES } from "../src/sync/types.js";
import {
  assertSyncPayloadEntities,
  buildSyncManifest,
  listMissingSyncEntities,
} from "../src/sync/manifest.js";
import { mergeSyncPayloads } from "../src/sync/mergeSyncPayload.js";
import {
  DEVICE_A_ID,
  DEVICE_B_ID,
  deviceAGraph,
  deviceBGraph,
  minimalSyncPayload,
} from "../src/sync/fixtures/two-device/payloads.js";
import { MockSyncProvider, createTwoDeviceSyncHarness } from "../src/sync/mockSyncProvider.js";
import { ManifestEntityMissing } from "../src/backup/errors.js";

describe("sync conflict (two-device harness)", () => {
  it("sync manifest covers §2.1.1 entity set", () => {
    const manifest = buildSyncManifest({
      exportedAt: "2026-06-15T00:00:00.000Z",
      deviceId: DEVICE_A_ID,
    });
    expect(manifest.included_entities).toEqual([...SYNC_REQUIRED_ENTITIES]);
    expect(manifest.sync_manifest_version).toBe(1);
    expect(manifest.device_id).toBe(DEVICE_A_ID);
  });

  it("rejects sync payload missing required entities", () => {
    const payload = minimalSyncPayload(DEVICE_A_ID, deviceAGraph());
    payload.sync_manifest.included_entities = payload.sync_manifest.included_entities.filter(
      (e) => e !== "learning_trace",
    );
    expect(() => assertSyncPayloadEntities(payload)).toThrow(ManifestEntityMissing);
    const missing = listMissingSyncEntities(payload.sync_manifest);
    expect(missing).toContain("learning_trace");
  });

  it("mock SyncProvider exchanges payloads between two devices", async () => {
    const { providerA, providerB } = createTwoDeviceSyncHarness({
      deviceAId: DEVICE_A_ID,
      deviceBId: DEVICE_B_ID,
    });
    const payloadA = minimalSyncPayload(DEVICE_A_ID, deviceAGraph());
    await providerA.push(payloadA);
    providerB.seedRemote(payloadA);

    const pulled = await providerB.pull();
    expect(pulled.payload?.sync_manifest.device_id).toBe(DEVICE_A_ID);
    expect(pulled.payload?.graph_snapshot.nodes).toHaveLength(2);
  });

  it("two-device merge routes unconfirmed remote nodes to provisional only", () => {
    const local = minimalSyncPayload(DEVICE_A_ID, deviceAGraph());
    const remote = minimalSyncPayload(DEVICE_B_ID, deviceBGraph());

    const result = mergeSyncPayloads(local, remote);
    expect(result.provisionalRouted.length).toBeGreaterThan(0);
    expect(result.merged.provisional_queue.some((p) => p.summary === "远端未确认")).toBe(true);
    expect(result.merged.graph_snapshot.nodes.some((n) => n.id === "b-unconfirmed")).toBe(false);
    expect(result.merged.learning_trace).toHaveLength(1);
    expect(result.merged.world_items).toHaveLength(1);
  });

  it("delete-as-archive: merged graph keeps archived node instead of removing", () => {
    const local = minimalSyncPayload(DEVICE_A_ID, {
      nodes: [
        {
          id: "b-deleted",
          concept: "将被归档",
          intro: "local copy",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-09T08:00:00.000Z",
          confirmedAt: "2026-06-09T08:01:00.000Z",
          ingestSource: "user_confirmed_ingest",
        },
      ],
      edges: [],
    });
    const remote = minimalSyncPayload(DEVICE_B_ID, deviceBGraph(), {
      graph_history: [
        {
          id: "hist-archive",
          kind: "node_archived",
          summary: "remote delete intent",
          before: {
            nodes: [
              {
                id: "b-deleted",
                concept: "将被归档",
                intro: "remote",
                sourceLinks: [],
                archived: false,
                createdAt: "2026-06-09T08:00:00.000Z",
                confirmedAt: "2026-06-09T08:01:00.000Z",
                ingestSource: "user_confirmed_ingest",
              },
            ],
            edges: [],
          },
          after: {
            nodes: [
              {
                id: "b-deleted",
                concept: "将被归档",
                intro: "remote",
                sourceLinks: [],
                archived: true,
                createdAt: "2026-06-09T08:00:00.000Z",
                confirmedAt: "2026-06-09T08:01:00.000Z",
                ingestSource: "user_confirmed_ingest",
              },
            ],
            edges: [],
          },
          createdAt: "2026-06-12T08:00:00.000Z",
          undone: false,
        },
      ],
    });

    const result = mergeSyncPayloads(local, remote);
    const archived = result.merged.graph_snapshot.nodes.find((n) => n.id === "b-deleted");
    expect(archived?.archived).toBe(true);
    expect(result.archivedNodeIds).toContain("b-deleted");
  });
});

describe("MockSyncProvider", () => {
  it("push then pull round-trips payload", async () => {
    const provider = new MockSyncProvider("solo");
    const payload = minimalSyncPayload("solo", deviceAGraph());
    await provider.push(payload);
    const pulled = await provider.pull();
    expect(pulled.payload?.graph_snapshot.nodes).toHaveLength(2);
  });
});
