import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  BetterSqliteDriver,
  MobileStorage,
  applyProfileCorrection,
  createEmptyCorrectionState,
  seedTraitsFromProfile,
} from "@my-brain/core";

import { exportLocalBackup } from "../backup/backupHandoff";
import {
  exportSyncPayloadJson,
  mergeRemoteSyncPayloadIntoSession,
  mergeRemoteSyncIntoSession,
} from "./syncHandoff";

function createSession(deviceId: string) {
  const dir = mkdtempSync(join(tmpdir(), `mybrain-sync-${deviceId}-`));
  const dbPath = join(dir, "mobile.db");
  const driver = new BetterSqliteDriver(dbPath);
  const storage = new MobileStorage(driver);
  storage.migrate();

  const profile = {
    primaryMode: "learner" as const,
    secondaryModes: [] as const,
    confidence: 0.85,
  };
  storage.saveUserModeProfile(profile, true);
  let correction = {
    ...createEmptyCorrectionState(),
    traits: seedTraitsFromProfile(profile),
  };
  correction = applyProfileCorrection(correction, "mode-learner", "suppress", "manual");
  storage.saveCorrectionState(correction);
  storage.saveGraphSnapshot({
    nodes: [
      {
        id: "local-node",
        concept: "本地",
        intro: "confirmed",
        sourceLinks: [],
        archived: false,
        createdAt: "2026-06-13T00:00:00.000Z",
        confirmedAt: "2026-06-13T00:01:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
    ],
    edges: [],
  });
  storage.saveProvisionalCandidates([]);
  storage.saveLearningTraces([
    { id: "lt-a", topic: "A", note: "n", createdAt: "2026-06-13T01:00:00.000Z" },
  ]);
  storage.saveWorldItems([
    { id: "wi-a", title: "A", freshness: 0.5, updatedAt: "2026-06-13T01:00:00.000Z" },
  ]);
  storage.saveAdaptiveSignals([], { offset: 0 });

  return {
    session: { storage, driver, dbPath },
    deviceId,
    cleanup: () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

describe("M7B mobile sync handoff", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
  });

  it("sync-conflict merge keeps manual suppression and routes unconfirmed remote to provisional", () => {
    const local = createSession("device-a");
    cleanup = local.cleanup;

    const remote = createSession("device-b");
    remote.session.storage.saveGraphSnapshot({
      nodes: [
        {
          id: "local-node",
          concept: "本地",
          intro: "confirmed",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-13T00:00:00.000Z",
          confirmedAt: "2026-06-13T00:01:00.000Z",
          ingestSource: "user_confirmed_ingest",
        },
        {
          id: "remote-unconfirmed",
          concept: "远端新建",
          intro: "no gate",
          sourceLinks: [],
          archived: false,
          createdAt: "2026-06-14T00:00:00.000Z",
        },
      ],
      edges: [],
    });
    const remoteSyncJson = exportSyncPayloadJson(remote.session, remote.deviceId);

    const merged = mergeRemoteSyncPayloadIntoSession(
      local.session,
      remoteSyncJson,
      local.deviceId,
    );
    expect(merged.ok).toBe(true);
    if (!merged.ok) {
      return;
    }

    expect(local.session.storage.loadCorrectionState().suppressionList).toContain("mode-learner");
    const provisional = local.session.storage.loadProvisionalCandidates();
    expect(provisional.some((p) => p.summary === "远端新建")).toBe(true);
    expect(
      local.session.storage.loadGraphSnapshot().nodes.some((n) => n.id === "remote-unconfirmed"),
    ).toBe(false);

    remote.cleanup();
  });

  it("profile-review-persist: local manual correction survives sync merge", () => {
    const local = createSession("device-a");
    cleanup = local.cleanup;
    const remote = createSession("device-b");

    const remoteExport = exportLocalBackup(remote.session);
    expect(remoteExport.ok).toBe(true);
    if (!remoteExport.ok) {
      remote.cleanup();
      return;
    }

    const result = mergeRemoteSyncIntoSession(
      local.session,
      remoteExport.json,
      "device-b",
      local.deviceId,
    );
    expect(result.ok).toBe(true);
    expect(local.session.storage.loadCorrectionState().corrections.some((c) => c.action === "suppress")).toBe(
      true,
    );

    remote.cleanup();
  });
});
