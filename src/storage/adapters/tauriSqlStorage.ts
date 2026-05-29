import Database from "@tauri-apps/plugin-sql";
import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/domain/profile";
import { INITIAL_MIGRATION_SQL, STORAGE_DB_NAME } from "../migrations";
import type { StorageProvider } from "../types";

/** Desktop storage via Tauri SQL plugin. */
export class TauriSqlStorageProvider implements StorageProvider {
  private db: Database | null = null;

  async init(): Promise<void> {
    this.db = await Database.load(`sqlite:${STORAGE_DB_NAME}`);
    await this.db.execute(INITIAL_MIGRATION_SQL);
  }

  async close(): Promise<void> {
    await this.db?.close();
    this.db = null;
  }

  async loadGraph(): Promise<BrainGraphSnapshot> {
    const db = this.requireDb();
    const nodes = await db.select<
      Array<Omit<ConceptNode, "archived"> & { archived: number }>
    >(
      `SELECT id, title, intro, source_url AS sourceUrl, archived,
              created_at AS createdAt, updated_at AS updatedAt
       FROM concepts
       WHERE archived = 0`,
    );

    const edges = await db.select<GraphEdge[]>(
      `SELECT id, source_id AS sourceId, target_id AS targetId,
              relation_type AS relationType
       FROM edges`,
    );

    return {
      nodes: nodes.map((row) => ({ ...row, archived: row.archived === 1 })),
      edges,
    };
  }

  async saveConcept(node: ConceptNode): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO concepts (id, title, intro, source_url, archived, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO UPDATE SET
         title = $2,
         intro = $3,
         source_url = $4,
         archived = $5,
         updated_at = $7`,
      [
        node.id,
        node.title,
        node.intro,
        node.sourceUrl,
        node.archived ? 1 : 0,
        node.createdAt,
        node.updatedAt,
      ],
    );
  }

  async saveEdge(edge: GraphEdge): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO edges (id, source_id, target_id, relation_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(id) DO UPDATE SET
         source_id = $2,
         target_id = $3,
         relation_type = $4`,
      [edge.id, edge.sourceId, edge.targetId, edge.relationType],
    );
  }

  async loadUserProfile(): Promise<UserProfile> {
    const db = this.requireDb();
    const rows = await db.select<Array<{ key: string; value: string }>>(
      "SELECT key, value FROM user_profile",
    );

    if (rows.length === 0) {
      return DEFAULT_USER_PROFILE;
    }

    const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      displayName: map.displayName || null,
      companionName: map.companionName || null,
      persona: (map.persona as UserProfile["persona"]) ?? "mentor",
      interests: JSON.parse(map.interests ?? "[]") as string[],
      knownTopics: JSON.parse(map.knownTopics ?? "[]") as string[],
      unknownTopics: JSON.parse(map.unknownTopics ?? "[]") as string[],
      explanationStyle: map.explanationStyle || null,
      habits: JSON.parse(map.habits ?? "[]") as string[],
      updatedAt: map.updatedAt ?? new Date(0).toISOString(),
    };
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const db = this.requireDb();
    const entries: Record<string, string> = {
      displayName: profile.displayName ?? "",
      companionName: profile.companionName ?? "",
      persona: profile.persona,
      interests: JSON.stringify(profile.interests),
      knownTopics: JSON.stringify(profile.knownTopics),
      unknownTopics: JSON.stringify(profile.unknownTopics),
      explanationStyle: profile.explanationStyle ?? "",
      habits: JSON.stringify(profile.habits),
      updatedAt: profile.updatedAt,
    };

    for (const [key, value] of Object.entries(entries)) {
      await db.execute(
        "INSERT INTO user_profile (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = $2",
        [key, value],
      );
    }
  }

  private requireDb(): Database {
    if (!this.db) {
      throw new Error("TauriSqlStorageProvider is not initialized");
    }
    return this.db;
  }
}
