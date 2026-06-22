import { describe, expect, it } from "vitest";

import { BACKUP_REQUIRED_ENTITIES } from "../src/backup/types.js";
import { SYNC_REQUIRED_ENTITIES } from "../src/sync/types.js";
import { buildSyncManifest } from "../src/sync/manifest.js";
import { minimalSyncPayload, deviceAGraph } from "../src/sync/fixtures/two-device/payloads.js";

describe("sync backupManifest entity coverage", () => {
  it("sync required entities align with M7 §2.1.1 backup manifest", () => {
    expect(SYNC_REQUIRED_ENTITIES).toEqual(BACKUP_REQUIRED_ENTITIES);
  });

  it("minimal sync payload includes all entity payload keys", () => {
    const payload = minimalSyncPayload("device-test", deviceAGraph());
    for (const entity of SYNC_REQUIRED_ENTITIES) {
      expect(payload.sync_manifest.included_entities).toContain(entity);
    }
    expect(payload.graph_snapshot).toBeDefined();
    expect(payload.graph_history).toBeDefined();
    expect(payload.user_mode_profile).toBeDefined();
    expect(payload.profile_correction_history).toBeDefined();
    expect(payload.profile_suppression_list).toBeDefined();
    expect(payload.profile_traits).toBeDefined();
    expect(payload.learning_trace).toBeDefined();
    expect(payload.provisional_queue).toBeDefined();
    expect(payload.world_items).toBeDefined();
    expect(payload.adaptive_radar_state).toBeDefined();
  });

  it("buildSyncManifest declares device_id and schema version", () => {
    const manifest = buildSyncManifest({
      exportedAt: "2026-06-15T00:00:00.000Z",
      deviceId: "device-test",
    });
    expect(manifest.device_id).toBe("device-test");
    expect(manifest.schema_version).toBeGreaterThan(0);
    expect(manifest.included_entities.length).toBe(SYNC_REQUIRED_ENTITIES.length);
  });
});
