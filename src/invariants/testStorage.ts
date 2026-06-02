import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BetterSqliteBackend } from "@/storage/adapters/betterSqliteBackend";
import { TauriSqlStorageProvider } from "@/storage/adapters/tauriSqlStorage";
import { createTauriTestDatabaseLoader } from "@/invariants/tauriSqlTestDatabase";
import type { StorageProvider } from "@/storage/types";

export type StorageBackendKind = "better-sqlite3" | "tauri-sql";

function wrapBetterSqliteBackend(backend: BetterSqliteBackend): StorageProvider {
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
    listPendingProposals: async () => backend.listPendingProposals(),
    saveProposal: async (proposal) => {
      backend.saveProposal(proposal);
    },
    setProposalStatus: async (id, status) => {
      backend.setProposalStatus(id, status);
    },
  };
}

export interface TempStorageFixture {
  kind: StorageBackendKind;
  storage: StorageProvider;
  dbPath: string;
  cleanup: () => void;
}

/** Spec A2: shared fixtures — run the same assertions on both storage adapters. */
export const STORAGE_BACKEND_KINDS: readonly StorageBackendKind[] = [
  "better-sqlite3",
  "tauri-sql",
] as const;

export function createTempStorage(
  kind: StorageBackendKind = "better-sqlite3",
): TempStorageFixture {
  const dir = mkdtempSync(join(tmpdir(), "mybrain-invariant-"));
  const dbPath = join(dir, "test.db");

  if (kind === "better-sqlite3") {
    const backend = new BetterSqliteBackend({ dbPath });
    return {
      kind,
      dbPath,
      storage: wrapBetterSqliteBackend(backend),
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

  const tauriLoader = createTauriTestDatabaseLoader(dbPath);
  const provider = new TauriSqlStorageProvider({
    loadDatabase: tauriLoader.load,
  });
  return {
    kind,
    dbPath,
    storage: provider,
    cleanup: () => {
      tauriLoader.closeNative();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export function reopenStorage(
  dbPath: string,
  kind: StorageBackendKind,
): StorageProvider {
  if (kind === "better-sqlite3") {
    return wrapBetterSqliteBackend(new BetterSqliteBackend({ dbPath }));
  }
  const tauriLoader = createTauriTestDatabaseLoader(dbPath);
  return new TauriSqlStorageProvider({
    loadDatabase: tauriLoader.load,
  });
}

export function readProposalStatusFromDb(
  dbPath: string,
  proposalId: string,
): string | undefined {
  const db = new Database(dbPath, { readonly: true });
  try {
    const row = db
      .prepare("SELECT status FROM agent_proposals WHERE id = ?")
      .get(proposalId) as { status: string } | undefined;
    return row?.status;
  } finally {
    db.close();
  }
}
