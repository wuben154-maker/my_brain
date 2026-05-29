import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";
import type { UserProfile } from "@/domain/profile";
import type { StorageProvider } from "../types";

const STORAGE_BASE = "/__my_brain/storage";

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${STORAGE_BASE}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Storage request failed: ${response.status} ${path}`);
  }

  return (await response.json()) as T;
}

/** Web-dev storage client — talks to Vite middleware backed by better-sqlite3. */
export class WebSqlStorageProvider implements StorageProvider {
  async init(): Promise<void> {
    await postJson("/init");
  }

  async close(): Promise<void> {
    await postJson("/close");
  }

  loadGraph(): Promise<BrainGraphSnapshot> {
    return postJson("/graph");
  }

  saveConcept(node: ConceptNode): Promise<void> {
    return postJson("/concept", node);
  }

  saveEdge(edge: GraphEdge): Promise<void> {
    return postJson("/edge", edge);
  }

  loadUserProfile(): Promise<UserProfile> {
    return postJson("/profile");
  }

  saveUserProfile(profile: UserProfile): Promise<void> {
    return postJson("/profile", profile);
  }
}
