import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import type { ProposalEnvelope, ProposalStatus } from "@/agent/types";
import type { StorageProvider } from "../types";

const STORAGE_BASE = "/__my_brain/storage";

async function storageFetch<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const method =
    options.method ?? (options.body !== undefined ? "POST" : "GET");
  const response = await fetch(`${STORAGE_BASE}${path}`, {
    method,
    headers:
      options.body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new Error(`Storage request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
}

/** Web-dev storage client — talks to Vite middleware backed by better-sqlite3. */
export class WebSqlStorageProvider implements StorageProvider {
  async init(): Promise<void> {
    await storageFetch("/init", { method: "POST" });
  }

  async close(): Promise<void> {
    await storageFetch("/close", { method: "POST" });
  }

  loadGraph(): Promise<BrainGraphSnapshot> {
    return storageFetch("/graph");
  }

  loadGraphForDisplay(): Promise<BrainGraphSnapshot> {
    return storageFetch("/graph/display");
  }

  saveConcept(node: ConceptNode): Promise<void> {
    return storageFetch("/concept", { body: node });
  }

  saveEdge(edge: GraphEdge): Promise<void> {
    return storageFetch("/edge", { body: edge });
  }

  deleteEdge(edgeId: string): Promise<void> {
    return storageFetch("/edge/delete", { method: "POST", body: { id: edgeId } });
  }

  loadUserProfile(): Promise<UserProfile> {
    return storageFetch("/profile");
  }

  saveUserProfile(profile: UserProfile): Promise<void> {
    return storageFetch("/profile", { body: profile });
  }

  listPendingProposals(): Promise<ProposalEnvelope[]> {
    return storageFetch("/proposals/pending");
  }

  saveProposal(p: ProposalEnvelope): Promise<void> {
    return storageFetch("/proposals/save", { body: p });
  }

  setProposalStatus(id: string, status: ProposalStatus): Promise<void> {
    return storageFetch("/proposals/status", { body: { id, status } });
  }
}
