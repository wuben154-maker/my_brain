/**
 * Minimal persistence for native share handoff queue (survives process kill).
 * RN runtime dynamically loads expo adapter; vitest injects node adapter from *.node.ts.
 */

import type { NativeShareHandoffRecord } from "./nativeShareHandoff";

export interface NativeShareHandoffPersistenceAdapter {
  load(): NativeShareHandoffRecord[];
  save(records: NativeShareHandoffRecord[]): void;
  clear(): void;
  /** Optional async disk hydrate (expo default adapter). */
  hydrate?(): Promise<void>;
}

let injectedAdapter: NativeShareHandoffPersistenceAdapter | null = null;
let defaultAdapter: NativeShareHandoffPersistenceAdapter | null = null;

function isVitestRuntime(): boolean {
  return typeof process !== "undefined" && process.env.VITEST === "true";
}

export function setNativeShareHandoffPersistenceAdapter(
  adapter: NativeShareHandoffPersistenceAdapter | null,
): void {
  injectedAdapter = adapter;
  if (adapter) {
    defaultAdapter = null;
  }
}

function getDefaultAdapter(): NativeShareHandoffPersistenceAdapter | null {
  if (defaultAdapter) {
    return defaultAdapter;
  }
  if (isVitestRuntime()) {
    return null;
  }
  try {
    // Dynamic require keeps expo-file-system out of the Vitest module graph.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require("expo-file-system") as {
      documentDirectory?: string | null;
    };
    const base = FileSystem.documentDirectory;
    if (!base) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createExpoFileHandoffPersistence } =
      require("./nativeShareHandoffPersistence.expo") as typeof import("./nativeShareHandoffPersistence.expo");
    defaultAdapter = createExpoFileHandoffPersistence(`${base}native-share-handoff-queue.json`);
    return defaultAdapter;
  } catch {
    return null;
  }
}

function getAdapter(): NativeShareHandoffPersistenceAdapter | null {
  return injectedAdapter ?? getDefaultAdapter();
}

/** Await disk hydrate before cold-start restore (no-op for injected sync adapters). */
export async function ensureNativeShareHandoffPersistenceReady(): Promise<void> {
  const adapter = getAdapter();
  if (adapter?.hydrate) {
    await adapter.hydrate();
  }
}

export function loadPersistedNativeShareHandoffs(): NativeShareHandoffRecord[] {
  const adapter = getAdapter();
  return adapter?.load() ?? [];
}

export function savePersistedNativeShareHandoffs(records: readonly NativeShareHandoffRecord[]): void {
  const adapter = getAdapter();
  if (!adapter) {
    return;
  }
  adapter.save([...records]);
}

export function clearPersistedNativeShareHandoffs(): void {
  const adapter = getAdapter();
  if (adapter) {
    adapter.clear();
  }
}
