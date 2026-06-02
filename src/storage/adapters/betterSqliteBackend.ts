import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "../../domain/graph";
import { DEFAULT_USER_PROFILE, type UserProfile } from "../../domain/profile";
import type { ProposalEnvelope, ProposalStatus } from "../../agent/types";
import { INITIAL_MIGRATION_SQL } from "../migrations";
import {
  assertProposalStatus,
  assertProposalStatusUpdated,
  LIST_PENDING_PROPOSALS_SQL,
  mapStoredProposalRows,
  prepareProposalUpsertRow,
  type StoredProposalRow,
} from "../proposalPersistence";

export interface BetterSqliteBackendOptions {
  dbPath: string;
}

/** Node-only SQLite backend for `pnpm dev` web target. */
export class BetterSqliteBackend {
  private db: Database.Database | null = null;

  constructor(private readonly options: BetterSqliteBackendOptions) {}

  init(): void {
    if (this.db) {
      return;
    }

    mkdirSync(dirname(this.options.dbPath), { recursive: true });
    this.db = new Database(this.options.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(INITIAL_MIGRATION_SQL);
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  loadGraph(): BrainGraphSnapshot {
    return this.filterActiveGraph(this.loadAllConceptsAndEdges());
  }

  loadGraphForDisplay(): BrainGraphSnapshot {
    return this.loadAllConceptsAndEdges();
  }

  private loadAllConceptsAndEdges(): BrainGraphSnapshot {
    const db = this.requireDb();
    const nodes = db
      .prepare(
        `SELECT id, title, intro, source_url AS sourceUrl, archived,
                created_at AS createdAt, updated_at AS updatedAt
         FROM concepts`,
      )
      .all() as Array<
      Omit<ConceptNode, "archived"> & { archived: number }
    >;

    const edges = db
      .prepare(
        `SELECT id, source_id AS sourceId, target_id AS targetId,
                relation_type AS relationType
         FROM edges`,
      )
      .all() as GraphEdge[];

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

  private filterActiveGraph(snapshot: BrainGraphSnapshot): BrainGraphSnapshot {
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

  deleteEdge(edgeId: string): void {
    const db = this.requireDb();
    db.prepare("DELETE FROM edges WHERE id = ?").run(edgeId);
  }

  saveConcept(node: ConceptNode): void {
    const db = this.requireDb();
    db.prepare(
      `INSERT INTO concepts (id, title, intro, source_url, archived, created_at, updated_at)
       VALUES (@id, @title, @intro, @sourceUrl, @archived, @createdAt, @updatedAt)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         intro = excluded.intro,
         source_url = excluded.source_url,
         archived = excluded.archived,
         updated_at = excluded.updated_at`,
    ).run({
      ...node,
      archived: node.archived ? 1 : 0,
    });
  }

  saveEdge(edge: GraphEdge): void {
    const db = this.requireDb();
    db.prepare(
      `INSERT INTO edges (id, source_id, target_id, relation_type)
       VALUES (@id, @sourceId, @targetId, @relationType)
       ON CONFLICT(id) DO UPDATE SET
         source_id = excluded.source_id,
         target_id = excluded.target_id,
         relation_type = excluded.relation_type`,
    ).run(edge);
  }

  loadUserProfile(): UserProfile {
    const db = this.requireDb();
    const rows = db
      .prepare("SELECT key, value FROM user_profile")
      .all() as Array<{ key: string; value: string }>;

    if (rows.length === 0) {
      return DEFAULT_USER_PROFILE;
    }

    const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      displayName: map.displayName ?? null,
      companionName: map.companionName ?? null,
      persona: (map.persona as UserProfile["persona"]) ?? "mentor",
      interests: JSON.parse(map.interests ?? "[]") as string[],
      knownTopics: JSON.parse(map.knownTopics ?? "[]") as string[],
      unknownTopics: JSON.parse(map.unknownTopics ?? "[]") as string[],
      explanationStyle: map.explanationStyle ?? null,
      habits: JSON.parse(map.habits ?? "[]") as string[],
      updatedAt: map.updatedAt ?? new Date(0).toISOString(),
    };
  }

  saveUserProfile(profile: UserProfile): void {
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

    const stmt = db.prepare(
      "INSERT INTO user_profile (key, value) VALUES (@key, @value) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    );

    const tx = db.transaction((records: Record<string, string>) => {
      for (const [key, value] of Object.entries(records)) {
        stmt.run({ key, value });
      }
    });

    tx(entries);
  }

  listPendingProposals(): ProposalEnvelope[] {
    const db = this.requireDb();
    const rows = db
      .prepare(LIST_PENDING_PROPOSALS_SQL)
      .all() as StoredProposalRow[];

    return mapStoredProposalRows(rows);
  }

  saveProposal(p: ProposalEnvelope): void {
    const row = prepareProposalUpsertRow(p);
    const db = this.requireDb();
    db.prepare(
      `INSERT INTO agent_proposals
         (id, run_id, created_at, kind, summary, payload, source, status)
       VALUES
         (@id, @run_id, @created_at, @kind, @summary, @payload, @source, @status)
       ON CONFLICT(id) DO UPDATE SET
         run_id = excluded.run_id,
         created_at = excluded.created_at,
         kind = excluded.kind,
         summary = excluded.summary,
         payload = excluded.payload,
         source = excluded.source,
         status = excluded.status`,
    ).run(row);
  }

  setProposalStatus(id: string, status: ProposalStatus): void {
    assertProposalStatus(status);
    const db = this.requireDb();
    const result = db
      .prepare("UPDATE agent_proposals SET status = ? WHERE id = ?")
      .run(status, id);
    assertProposalStatusUpdated(id, result.changes);
  }

  getAppMeta(key: string): string | null {
    const db = this.requireDb();
    const row = db
      .prepare("SELECT value FROM app_meta WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setAppMeta(key: string, value: string): void {
    const db = this.requireDb();
    db.prepare(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(key, value);
  }

  private requireDb(): Database.Database {
    if (!this.db) {
      throw new Error("BetterSqliteBackend is not initialized");
    }
    return this.db;
  }
}

export function defaultWebDbPath(): string {
  return join(process.cwd(), ".data", "mybrain.db");
}
