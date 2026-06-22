import {
  exportBackupSnapshotFromStorage,
  importBackupSnapshot,
  parseBackupJson,
  serializeBackupSnapshot,
} from "@my-brain/core";

import { hydrateMobileStores } from "../stores/persistHydrate";
import { useMobileAppStore } from "../stores/mobileAppStore";
import type { StorageSession } from "../storage/storageSession";
export type BackupExportResult =
  | { ok: true; json: string; entityCount: number }
  | { ok: false; reason: string; hintCode?: string };

export type BackupImportResult =
  | { ok: true; restoredEntities: number }
  | { ok: false; reason: string; hintCode?: string };

function readStructuredHint(error: unknown): string | undefined {
  return typeof error === "object" &&
    error !== null &&
    "hint_code" in error &&
    typeof (error as { hint_code?: unknown }).hint_code === "string"
    ? (error as { hint_code: string }).hint_code
    : undefined;
}

export function exportLocalBackup(session: StorageSession): BackupExportResult {
  try {
    const payload = exportBackupSnapshotFromStorage(session.storage);
    return {
      ok: true,
      json: serializeBackupSnapshot(payload),
      entityCount: payload.manifest.included_entities.length,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "export failed",
      hintCode: readStructuredHint(error),
    };
  }
}

export function importLocalBackup(
  session: StorageSession,
  json: string,
): BackupImportResult {
  try {
    const payload = parseBackupJson(json);
    importBackupSnapshot(session.storage, payload);
    return {
      ok: true,
      restoredEntities: payload.manifest.included_entities.length,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "import failed",
      hintCode: readStructuredHint(error),
    };
  }
}

/** SQLite import + in-memory store rehydrate — required for E5 backup round-trip UX. */
export function importLocalBackupAndRehydrate(
  session: StorageSession,
  json: string,
  hasApiKey: boolean,
): BackupImportResult {
  const result = importLocalBackup(session, json);
  if (!result.ok) {
    return result;
  }
  const bundle = session.storage.hydrateBundle();
  hydrateMobileStores(bundle, hasApiKey);
  useMobileAppStore.setState({
    providerStatus: { ...bundle.providerConfig, storage: "ready" },
  });
  return result;
}

