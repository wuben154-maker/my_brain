import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BetterSqliteBackend } from "@/storage/adapters/betterSqliteBackend";
import type { StorageProvider } from "@/storage/types";

function wrapBackend(backend: BetterSqliteBackend): StorageProvider {
  return {
    init: async () => {
      backend.init();
    },
    close: async () => {
      backend.close();
    },
    loadGraph: async () => backend.loadGraph(),
    loadGraphForDisplay: async () => backend.loadGraphForDisplay(),
    saveConcept: async (node) => {
      backend.saveConcept(node);
    },
    saveEdge: async (edge) => {
      backend.saveEdge(edge);
    },
    deleteEdge: async (edgeId) => {
      backend.deleteEdge(edgeId);
    },
    loadUserProfile: async () => backend.loadUserProfile(),
    saveUserProfile: async (profile) => {
      backend.saveUserProfile(profile);
    },
  };
}

export interface TempStorageFixture {
  storage: StorageProvider;
  dbPath: string;
  cleanup: () => void;
}

/** Ephemeral SQLite for invariant integration tests. */
export function createTempStorage(): TempStorageFixture {
  const dir = mkdtempSync(join(tmpdir(), "mybrain-invariant-"));
  const dbPath = join(dir, "test.db");
  const backend = new BetterSqliteBackend({ dbPath });
  return {
    dbPath,
    storage: wrapBackend(backend),
    cleanup: () => {
      try {
        backend.close();
      } catch {
        // already closed
      }
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
