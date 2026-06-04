import Database from "@tauri-apps/plugin-sql";

import type { TauriSqlDatabaseLike } from "./tauriSqlDatabase";

import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "@/domain/graph";

import { DEFAULT_USER_PROFILE, type UserProfile } from "@/domain/profile";

import type { ProposalEnvelope, ProposalStatus } from "@/agent/types";

import { INITIAL_MIGRATION_SQL, STORAGE_DB_NAME } from "../migrations";

import { migrateConceptSalienceColumnsTauri, migrateGraphHistoryTableTauri } from "../schemaMigrations";
import type { GraphHistoryEntry } from "@/domain/graphHistory";

import { normalizeConceptSalience } from "@/lib/salience";

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

    await this.db.execute("PRAGMA foreign_keys = ON");

    await this.db.execute(INITIAL_MIGRATION_SQL);

    await migrateConceptSalienceColumnsTauri(this.db);
    await migrateGraphHistoryTableTauri(this.db);

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

              created_at AS createdAt, updated_at AS updatedAt,

              salience, last_touched_at AS lastTouchedAt

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

      nodes: nodes.map((row) =>

        normalizeConceptSalience({

          ...row,

          archived: row.archived === 1,

          salience: row.salience ?? undefined,

          lastTouchedAt: row.lastTouchedAt ?? undefined,

        }),

      ),

      edges: displayEdges,

    };

  }



  async saveConcept(node: ConceptNode): Promise<void> {

    const db = this.requireDb();

    await db.execute(

      `INSERT INTO concepts (id, title, intro, source_url, archived, created_at, updated_at,

                            salience, last_touched_at)

       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)

       ON CONFLICT(id) DO UPDATE SET

         title = $2,

         intro = $3,

         source_url = $4,

         archived = $5,

         updated_at = $7,

         salience = $8,

         last_touched_at = $9`,

      [

        node.id,

        node.title,

        node.intro,

        node.sourceUrl,

        node.archived ? 1 : 0,

        node.createdAt,

        node.updatedAt,

        node.salience ?? 1,

        node.lastTouchedAt ?? node.updatedAt,

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



  async deleteConcept(conceptId: string): Promise<void> {

    const db = this.requireDb();

    await db.execute(

      "DELETE FROM edges WHERE source_id = $1 OR target_id = $1",

      [conceptId],

    );

    await db.execute("DELETE FROM concepts WHERE id = $1", [conceptId]);

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

      topicWeights: JSON.parse(map.topicWeights ?? "{}") as Record<

        string,

        number

      >,

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

      topicWeights: JSON.stringify(profile.topicWeights ?? {}),

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



  async getAppMeta(key: string): Promise<string | null> {

    const db = this.requireDb();

    const rows = await db.select<{ value: string }[]>(

      "SELECT value FROM app_meta WHERE key = $1",

      [key],

    );

    return rows[0]?.value ?? null;

  }



  async setAppMeta(key: string, value: string): Promise<void> {

    const db = this.requireDb();

    await db.execute(

      `INSERT INTO app_meta (key, value) VALUES ($1, $2)

       ON CONFLICT(key) DO UPDATE SET value = $2`,

      [key, value],

    );

  }



  async loadAgentUsage(usageDate: string): Promise<number> {

    const db = this.requireDb();

    const rows = await db.select<{ tokens: number }[]>(

      "SELECT tokens FROM agent_usage WHERE usage_date = $1",

      [usageDate],

    );

    return rows[0]?.tokens ?? 0;

  }



  async addAgentUsage(usageDate: string, tokens: number): Promise<void> {

    if (tokens <= 0) {

      return;

    }

    const db = this.requireDb();

    await db.execute(

      `INSERT INTO agent_usage (usage_date, tokens) VALUES ($1, $2)

       ON CONFLICT(usage_date) DO UPDATE SET tokens = agent_usage.tokens + excluded.tokens`,

      [usageDate, tokens],

    );

  }




  async listGraphHistory(): Promise<GraphHistoryEntry[]> {
    const db = this.requireDb();
    const rows = await db.select<
      Array<{
        id: string;
        at: string;
        kind: GraphHistoryEntry["kind"];
        summary: string;
        before_json: string;
        after_json: string;
        undone: number;
      }>
    >(
      "SELECT id, at, kind, summary, before_json, after_json, undone FROM graph_history ORDER BY at DESC",
    );
    return rows.map((row) => ({
      id: row.id,
      at: row.at,
      kind: row.kind,
      summary: row.summary,
      before: JSON.parse(row.before_json),
      after: JSON.parse(row.after_json),
      undone: row.undone === 1 ? true : undefined,
    }));
  }

  async saveGraphHistoryEntry(entry: GraphHistoryEntry): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO graph_history (id, at, kind, summary, before_json, after_json, undone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO UPDATE SET
         at = excluded.at,
         kind = excluded.kind,
         summary = excluded.summary,
         before_json = excluded.before_json,
         after_json = excluded.after_json,
         undone = excluded.undone`,
      [
        entry.id,
        entry.at,
        entry.kind,
        entry.summary,
        JSON.stringify(entry.before),
        JSON.stringify(entry.after),
        entry.undone ? 1 : 0,
      ],
    );
  }

  async setGraphHistoryUndone(id: string): Promise<void> {
    await this.requireDb().execute(
      "UPDATE graph_history SET undone = 1 WHERE id = $1",
      [id],
    );
  }

  private requireDb(): TauriSqlDatabase {

    if (!this.db) {

      throw new Error("TauriSqlStorageProvider is not initialized");

    }

    return this.db;

  }

}

