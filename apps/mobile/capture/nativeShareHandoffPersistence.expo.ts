/**
 * Expo FileSystem handoff persistence — loaded only in RN runtime (dynamic require).
 */

import * as FileSystem from "expo-file-system";

import type { NativeShareHandoffRecord } from "./nativeShareHandoff";
import type { NativeShareHandoffPersistenceAdapter } from "./nativeShareHandoffPersistence";

export function createExpoFileHandoffPersistence(
  fileUri: string,
): NativeShareHandoffPersistenceAdapter {
  let memoryRecords: NativeShareHandoffRecord[] = [];
  let hydrated = false;
  let hydratePromise: Promise<void> | null = null;

  async function persistToDisk(records: readonly NativeShareHandoffRecord[]): Promise<void> {
    if (records.length === 0) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      return;
    }
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(records));
  }

  return {
    async hydrate() {
      if (hydrated) {
        return;
      }
      if (hydratePromise) {
        await hydratePromise;
        return;
      }
      hydratePromise = (async () => {
        try {
          const info = await FileSystem.getInfoAsync(fileUri);
          if (!info.exists) {
            memoryRecords = [];
            return;
          }
          const raw = await FileSystem.readAsStringAsync(fileUri);
          const parsed = JSON.parse(raw) as unknown;
          memoryRecords = Array.isArray(parsed) ? (parsed as NativeShareHandoffRecord[]) : [];
        } catch {
          memoryRecords = [];
        } finally {
          hydrated = true;
          hydratePromise = null;
        }
      })();
      await hydratePromise;
    },
    load() {
      return [...memoryRecords];
    },
    save(records) {
      memoryRecords = [...records];
      void persistToDisk(records).catch(() => {
        /* best-effort; in-memory queue remains authoritative until next save */
      });
    },
    clear() {
      memoryRecords = [];
      void FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {
        /* best-effort */
      });
    },
  };
}
