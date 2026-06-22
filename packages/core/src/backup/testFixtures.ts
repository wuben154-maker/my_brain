import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { UserModeProfile } from "../domain/userMode.js";
import { generateAdaptiveSignals } from "../radar/adaptiveRadar.js";
import {
  applyProfileCorrection,
  createEmptyCorrectionState,
  seedTraitsFromProfile,
} from "../profile/correctionHistory.js";
import { createProvisionalCandidate } from "../provisional/queue.js";
import { BetterSqliteDriver } from "../storage/betterSqliteDriver.js";
import { MobileStorage } from "../storage/mobileStorage.js";
import { configureBackupCryptoPort } from "./cryptoPort.js";
import { createNodeBackupCryptoPort } from "./nodeCryptoAdapter.js";

let backupCryptoConfiguredForTests = false;

/** Gate-path shim tests and src/backup tests share Node scrypt adapter. */
export function ensureBackupCryptoForTests(): void {
  if (backupCryptoConfiguredForTests) {
    return;
  }
  configureBackupCryptoPort(createNodeBackupCryptoPort());
  backupCryptoConfiguredForTests = true;
}

export function createPopulatedStorage(): {
  storage: MobileStorage;
  cleanup: () => void;
  profile: UserModeProfile;
} {
  ensureBackupCryptoForTests();
  const dir = mkdtempSync(join(tmpdir(), "mybrain-backup-"));
  const driver = new BetterSqliteDriver(join(dir, "device-a.db"));
  const storage = new MobileStorage(driver);
  storage.migrate();

  const profile: UserModeProfile = {
    primaryMode: "learner",
    secondaryModes: ["personal_memory"],
    confidence: 0.82,
    recentIntent: "学习 TypeScript 模式",
  };
  storage.saveUserModeProfile(profile, true);

  let correction = {
    ...createEmptyCorrectionState(),
    traits: seedTraitsFromProfile(profile),
  };
  correction = applyProfileCorrection(
    correction,
    "mode-learner",
    "suppress",
    "我不是来学 TS 的",
  );
  storage.saveCorrectionState(correction);

  const before = { nodes: [], edges: [] };
  const after = {
    nodes: [
      {
        id: "node-confirmed-1",
        concept: "闭包",
        intro: "函数捕获词法环境",
        sourceLinks: ["https://example.com/closures"],
        archived: false,
        createdAt: "2026-06-10T08:00:00.000Z",
        confirmedAt: "2026-06-10T08:05:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
      {
        id: "node-archived-1",
        concept: "旧概念",
        intro: "已归档",
        sourceLinks: [],
        archived: true,
        createdAt: "2026-06-01T08:00:00.000Z",
        confirmedAt: "2026-06-01T08:01:00.000Z",
        ingestSource: "user_confirmed_ingest",
      },
    ],
    edges: [
      {
        id: "edge-1",
        fromId: "node-confirmed-1",
        toId: "node-archived-1",
        relation: "related",
      },
    ],
  };
  storage.coTransactGraphAndHistory(before, after, {
    id: "hist-1",
    kind: "node_created",
    summary: "确认入库闭包",
    before,
    after,
    createdAt: "2026-06-10T08:05:00.000Z",
    undone: false,
  });

  const pending = createProvisionalCandidate({
    sourceType: "link",
    summary: "待确认链接",
    linkUrl: "https://example.com/pending",
  });
  pending.ingestSource = "provisional_pending";
  const confirmedProv = createProvisionalCandidate({
    sourceType: "text",
    summary: "已确认候选",
  });
  confirmedProv.status = "confirmed";
  confirmedProv.confirmedAt = "2026-06-11T09:00:00.000Z";
  confirmedProv.ingestSource = "user_confirmed_ingest";
  storage.saveProvisionalCandidates([pending, confirmedProv]);

  storage.saveLearningTraces([
    {
      id: "lt-1",
      topic: "TypeScript",
      note: "复习泛型",
      createdAt: "2026-06-12T10:00:00.000Z",
    },
  ]);

  storage.saveWorldItems([
    {
      id: "wi-1",
      title: "Rust 1.87",
      freshness: 0.7,
      updatedAt: "2026-06-12T11:00:00.000Z",
    },
  ]);

  const signals = generateAdaptiveSignals(profile, correction.suppressionList);
  storage.saveAdaptiveSignals(signals, { lastSeenId: "sig-0", offset: 2 });

  return {
    storage,
    profile,
    cleanup: () => {
      driver.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export function reopenStorage(dbPath: string): { storage: MobileStorage; driver: BetterSqliteDriver } {
  const driver = new BetterSqliteDriver(dbPath);
  const storage = new MobileStorage(driver);
  storage.migrate();
  return { storage, driver };
}
