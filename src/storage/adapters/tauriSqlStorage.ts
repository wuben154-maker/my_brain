import Database from "@tauri-apps/plugin-sql";
import type { TauriSqlDatabaseLike } from "./tauriSqlDatabase";
import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/domain/profile";
import type { ProposalEnvelope, ProposalStatus } from "@/agent/types";
import { INITIAL_MIGRATION_SQL, STORAGE_DB_NAME } from "../migrations";
import {
  assertProposalStatus,
  assertProposalStatusUpdated,
  LIST_PENDING_PROPOSALS_SQL,
  mapStoredProposalRows,
  prepareProposalUpsertRow,
  type StoredProposalRow,
} from "../proposalPersistence";
import type { StorageProvider } from "../types";

export type TauriSqlDatabase = Database | TauriSqlDatabaseLike;

export interface TauriSqlStorageOptions {
  /** Test-only: run Tauri SQL paths against better-sqlite3 (see `tauriSqlTestDatabase.ts`). */
  loadDatabase?: (uri: string) => Promise<TauriSqlDatabase>;
}

/** Desktop storage via Tauri SQL plugin. */
export class TauriSqlStorageProvider implements StorageProvider {
  private db: TauriSqlDatabase | null = null;

  constructor(private readonly options: TauriSqlStorageOptions = {}) {}

  async init(): Promise<void> {
    const load = this.options.loadDatabase ?? ((uri) => Database.load(uri));
    this.db = await load(`sqlite:${STORAGE_DB_NAME}`);
    await this.db.execute(INITIAL_MIGRATION_SQL);
  }

  async close(): Promise<void> {
    await this.db?.close();
    this.db = null;
  }

  async loadGraph(): Promise<BrainGraphSnapshot> {
    const snapshot = await this.loadAllConceptsAndEdges();
    const activeIds = new Set(
      snapshot.nodes.filter((node) => !node.archived).map((node) => node.id),
    );
    return {
      nodes: snapshot.nodes.filter((node) => !node.archived),
      edges: snapshot.edges.filter(
        (edge) => activeIds.has(edge.sourceId) && activeIds.has(edge.targetId),
      ),
    };
  }

  async loadGraphForDisplay(): Promise<BrainGraphSnapshot> {
    return this.loadAllConceptsAndEdges();
  }

  private async loadAllConceptsAndEdges(): Promise<BrainGraphSnapshot> {
    const db = this.requireDb();
    const nodes = await db.select<
      Array<Omit<ConceptNode, "archived"> & { archived: number }>
    >(
      `SELECT id, title, intro, source_url AS sourceUrl, archived,
              created_at AS createdAt, updated_at AS updatedAt
       FROM concepts`,
    );

    const edges = await db.select<GraphEdge[]>(
      `SELECT id, source_id AS sourceId, target_id AS targetId,
              relation_type AS relationType
       FROM edges`,
    );

    const conceptIds = new Set(nodes.map((node) => node.id));
    const displayEdges = edges.filter(
      (edge) =>
        conceptIds.has(edge.sourceId) && conceptIds.has(edge.targetId),
    );

    return {
      nodes: nodes.map((row) => ({ ...row, archived: row.archived === 1 })),
      edges: displayEdges,
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

  async deleteEdge(edgeId: string): Promise<void> {
    const db = this.requireDb();
    await db.execute("DELETE FROM edges WHERE id = $1", [edgeId]);
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

  async listPendingProposals(): Promise<ProposalEnvelope[]> {
    const db = this.requireDb();
    const rows = await db.select<StoredProposalRow[]>(LIST_PENDING_PROPOSALS_SQL);
    return mapStoredProposalRows(rows);
  }

  async saveProposal(p: ProposalEnvelope): Promise<void> {
    const row = prepareProposalUpsertRow(p);
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO agent_proposals
         (id, run_id, created_at, kind, summary, payload, source, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET
         run_id = $2,
         created_at = $3,
         kind = $4,
         summary = $5,
         payload = $6,
         source = $7,
         status = $8`,
      [
        row.id,
        row.run_id,
        row.created_at,
        row.kind,
        row.summary,
        row.payload,
        row.source,
        row.status,
      ],
    );
  }

  async setProposalStatus(id: string, status: ProposalStatus): Promise<void> {
    assertProposalStatus(status);
    const db = this.requireDb();
    const result = await db.execute(
      "UPDATE agent_proposals SET status = $1 WHERE id = $2",
      [status, id],
    );
    assertProposalStatusUpdated(id, result.rowsAffected ?? 0);
  }

  private requireDb(): TauriSqlDatabase {
    if (!this.db) {
      throw new Error("TauriSqlStorageProvider is not initialized");
    }
    return this.db;
  }
}
