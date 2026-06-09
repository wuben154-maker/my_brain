import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { BrainGraphSnapshot, ConceptNode, GraphEdge } from "../../domain/graph";
import { DEFAULT_USER_PROFILE, type UserProfile } from "../../domain/profile";
import {
  parseProfileExtensionFields,
  serializeProfileExtensionFields,
} from "../../domain/profile/profileStorageFields";
import type { ProposalEnvelope, ProposalStatus } from "../../agent/types";
import { INITIAL_MIGRATION_SQL } from "../migrations";
import type {
  CurationReasonCode,
  GraphHistoryEntry,
} from "../../domain/graphHistory";
import { normalizeGraphHistoryEntry } from "../../domain/graphHistory";
import type { CognitiveAction } from "../../domain/actions/cognitiveAction";
import {
  mapStoredCognitiveActionRow,
  serializeCognitiveActionCitations,
  serializeCognitiveActionMetadata,
} from "../../domain/actions/cognitiveAction";
import type { LearningTrace } from "../../domain/learning/learningTrace";
import { serializeLearningTraceMetadata } from "../../domain/learning/learningTrace";
import { mapStoredLearningTraceRow } from "../../learning/learningTraceStore";
import {
  migrateCognitiveActionsMetadataColumnSqlite,
  migrateCognitiveActionsTableSqlite,
  migrateConceptSalienceColumnsSqlite,
  migrateConceptTemporalColumnsSqlite,
  migrateGraphHistoryProvenanceSqlite,
  migrateGraphHistoryTableSqlite,
  migrateConceptSourceRefsColumnsSqlite,
  migrateEdgeArchivedColumnSqlite,
  migrateLearningTracesTableSqlite,
} from "../schemaMigrations";
import {
  normalizeConceptProvenance,
  parseSourceRefsJson,
  serializeSourceRefsJson,
} from "../../domain/graph/sourceRef";
import { normalizeConceptSalience } from "../../lib/salience";
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
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("journal_mode = WAL");
    this.db.exec(INITIAL_MIGRATION_SQL);
    migrateConceptSalienceColumnsSqlite(this.db);
    migrateConceptTemporalColumnsSqlite(this.db);
    migrateGraphHistoryTableSqlite(this.db);
    migrateGraphHistoryProvenanceSqlite(this.db);
    migrateLearningTracesTableSqlite(this.db);
    migrateCognitiveActionsTableSqlite(this.db);
    migrateCognitiveActionsMetadataColumnSqlite(this.db);
    migrateConceptSourceRefsColumnsSqlite(this.db);
    migrateEdgeArchivedColumnSqlite(this.db);
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  loadGraph(): BrainGraphSnapshot {
    return this.filterActiveGraph(this.loadAllConceptsAndEdges());
  }

  loadGraphForDisplay(): BrainGraphSnapshot {
    const snapshot = this.loadAllConceptsAndEdges();
    const conceptIds = new Set(snapshot.nodes.map((node) => node.id));
    return {
      nodes: snapshot.nodes,
      edges: this.filterVisibleEdges(snapshot.edges, conceptIds),
    };
  }

  private loadAllConceptsAndEdges(): BrainGraphSnapshot {
    const db = this.requireDb();
    const nodes = db
      .prepare(
        `SELECT id, title, intro, source_url AS sourceUrl, source_refs_json AS sourceRefsJson,
                archived, created_at AS createdAt, updated_at AS updatedAt,
                salience, last_touched_at AS lastTouchedAt,
                archived_at AS archivedAt, supersedes_node_id AS supersedesNodeId
         FROM concepts`,
      )
      .all() as Array<
      Omit<ConceptNode, "archived" | "sourceRefs"> & {
        archived: number;
        sourceRefsJson?: string | null;
        salience?: number | null;
        lastTouchedAt?: string | null;
        archivedAt?: string | null;
        supersedesNodeId?: string | null;
      }
    >;

    const edges = db
      .prepare(
        `SELECT id, source_id AS sourceId, target_id AS targetId,
                relation_type AS relationType, archived
         FROM edges`,
      )
      .all() as Array<
      Omit<GraphEdge, "archived"> & { archived: number }
    >;

    const conceptIds = new Set(nodes.map((node) => node.id));
    const displayEdges = this.filterVisibleEdges(
      edges.map((row) => ({
        ...row,
        archived: row.archived === 1,
      })),
      conceptIds,
    );

    return {
      nodes: nodes.map((row) =>
        normalizeConceptProvenance(
          normalizeConceptSalience({
            ...row,
            sourceRefs: parseSourceRefsJson(row.sourceRefsJson),
            archived: row.archived === 1,
            salience: row.salience ?? undefined,
            lastTouchedAt: row.lastTouchedAt ?? undefined,
            archivedAt: row.archivedAt ?? undefined,
            supersedesNodeId: row.supersedesNodeId ?? undefined,
          }),
        ),
      ),
      edges: displayEdges,
    };
  }

  private filterVisibleEdges(
    edges: GraphEdge[],
    conceptIds: Set<string>,
  ): GraphEdge[] {
    return edges.filter(
      (edge) =>
        !edge.archived &&
        conceptIds.has(edge.sourceId) &&
        conceptIds.has(edge.targetId),
    );
  }

  private filterActiveGraph(snapshot: BrainGraphSnapshot): BrainGraphSnapshot {
    const activeIds = new Set(
      snapshot.nodes.filter((node) => !node.archived).map((node) => node.id),
    );
    return {
      nodes: snapshot.nodes.filter((node) => !node.archived),
      edges: this.filterVisibleEdges(snapshot.edges, activeIds),
    };
  }

  deleteEdge(edgeId: string): void {
    const db = this.requireDb();
    db.prepare("DELETE FROM edges WHERE id = ?").run(edgeId);
  }

  /** Graph-history undo: reconcile edge rows via soft-archive (no SQL DELETE). */
  syncEdgesSnapshot(edges: GraphEdge[]): void {
    const db = this.requireDb();
    const keepIds = new Set(edges.map((edge) => edge.id));
    const archiveStmt = db.prepare(
      "UPDATE edges SET archived = 1 WHERE id = ?",
    );
    const existing = db
      .prepare("SELECT id FROM edges")
      .all() as Array<{ id: string }>;
    for (const row of existing) {
      if (!keepIds.has(row.id)) {
        archiveStmt.run(row.id);
      }
    }
    for (const edge of edges) {
      this.saveEdge({ ...edge, archived: false });
    }
  }

  deleteConcept(conceptId: string): void {
    const db = this.requireDb();
    db.prepare("DELETE FROM edges WHERE source_id = ? OR target_id = ?").run(
      conceptId,
      conceptId,
    );
    db.prepare("DELETE FROM concepts WHERE id = ?").run(conceptId);
  }

  saveConcept(node: ConceptNode): void {
    const db = this.requireDb();
    db.prepare(
      `INSERT INTO concepts (id, title, intro, source_url, source_refs_json, archived, created_at, updated_at,
                            salience, last_touched_at, archived_at, supersedes_node_id)
       VALUES (@id, @title, @intro, @sourceUrl, @sourceRefsJson, @archived, @createdAt, @updatedAt,
               @salience, @lastTouchedAt, @archivedAt, @supersedesNodeId)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         intro = excluded.intro,
         source_url = excluded.source_url,
         source_refs_json = excluded.source_refs_json,
         archived = excluded.archived,
         updated_at = excluded.updated_at,
         salience = excluded.salience,
         last_touched_at = excluded.last_touched_at,
         archived_at = excluded.archived_at,
         supersedes_node_id = excluded.supersedes_node_id`,
    ).run((() => {
      const normalized = normalizeConceptProvenance(normalizeConceptSalience(node));
      return {
      ...normalized,
      sourceRefsJson: serializeSourceRefsJson(normalized.sourceRefs ?? []),
      archived: node.archived ? 1 : 0,
      salience: node.salience ?? 1,
      lastTouchedAt: node.lastTouchedAt ?? node.updatedAt,
      archivedAt: node.archivedAt ?? null,
      supersedesNodeId: node.supersedesNodeId ?? null,
    };
    })());
  }

  saveEdge(edge: GraphEdge): void {
    const db = this.requireDb();
    db.prepare(
      `INSERT INTO edges (id, source_id, target_id, relation_type, archived)
       VALUES (@id, @sourceId, @targetId, @relationType, @archived)
       ON CONFLICT(id) DO UPDATE SET
         source_id = excluded.source_id,
         target_id = excluded.target_id,
         relation_type = excluded.relation_type,
         archived = excluded.archived`,
    ).run({
      ...edge,
      archived: edge.archived ? 1 : 0,
    });
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
    const extensions = parseProfileExtensionFields(map);
    return {
      displayName: map.displayName ?? null,
      companionName: map.companionName ?? null,
      persona: (map.persona as UserProfile["persona"]) ?? "mentor",
      interests: JSON.parse(map.interests ?? "[]") as string[],
      knownTopics: JSON.parse(map.knownTopics ?? "[]") as string[],
      unknownTopics: JSON.parse(map.unknownTopics ?? "[]") as string[],
      explanationStyle: map.explanationStyle ?? null,
      habits: JSON.parse(map.habits ?? "[]") as string[],
      topicWeights: JSON.parse(map.topicWeights ?? "{}") as Record<
        string,
        number
      >,
      ...extensions,
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
      topicWeights: JSON.stringify(profile.topicWeights ?? {}),
      updatedAt: profile.updatedAt,
      ...serializeProfileExtensionFields(profile),
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

  loadAgentUsage(usageDate: string): number {
    const db = this.requireDb();
    const row = db
      .prepare("SELECT tokens FROM agent_usage WHERE usage_date = ?")
      .get(usageDate) as { tokens: number } | undefined;
    return row?.tokens ?? 0;
  }

  addAgentUsage(usageDate: string, tokens: number): void {
    if (tokens <= 0) {
      return;
    }
    const db = this.requireDb();
    db.prepare(
      `INSERT INTO agent_usage (usage_date, tokens) VALUES (?, ?)
       ON CONFLICT(usage_date) DO UPDATE SET tokens = tokens + excluded.tokens`,
    ).run(usageDate, tokens);
  }

  listGraphHistory(): GraphHistoryEntry[] {
    const db = this.requireDb();
    const rows = db
      .prepare(
        `SELECT id, at, kind, summary, before_json AS beforeJson, after_json AS afterJson, undone,
                reason_code AS reasonCode, reason_detail AS reasonDetail,
                affected_node_ids AS affectedNodeIdsJson,
                affected_edge_ids AS affectedEdgeIdsJson,
                edge_migrations AS edgeMigrationsJson
         FROM graph_history ORDER BY at DESC`,
      )
      .all() as Array<{
      id: string;
      at: string;
      kind: GraphHistoryEntry["kind"];
      summary: string;
      beforeJson: string;
      afterJson: string;
      undone: number;
      reasonCode?: string | null;
      reasonDetail?: string | null;
      affectedNodeIdsJson?: string | null;
      affectedEdgeIdsJson?: string | null;
      edgeMigrationsJson?: string | null;
    }>;
    return rows.map((row) =>
      normalizeGraphHistoryEntry({
        id: row.id,
        at: row.at,
        kind: row.kind,
        summary: row.summary,
        before: JSON.parse(row.beforeJson) as BrainGraphSnapshot,
        after: JSON.parse(row.afterJson) as BrainGraphSnapshot,
        reasonCode: (row.reasonCode ?? "manual") as CurationReasonCode,
        reasonDetail: row.reasonDetail ?? "",
        affectedNodeIds: JSON.parse(row.affectedNodeIdsJson ?? "[]") as string[],
        affectedEdgeIds: JSON.parse(row.affectedEdgeIdsJson ?? "[]") as string[],
        edgeMigrations: JSON.parse(row.edgeMigrationsJson ?? "[]") as GraphHistoryEntry["edgeMigrations"],
        undone: row.undone === 1 ? true : undefined,
      }),
    );
  }

  saveGraphHistoryEntry(entry: GraphHistoryEntry): void {
    const db = this.requireDb();
    db.prepare(
      `INSERT INTO graph_history (id, at, kind, summary, before_json, after_json, undone,
                                  reason_code, reason_detail, affected_node_ids,
                                  affected_edge_ids, edge_migrations)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         at = excluded.at,
         kind = excluded.kind,
         summary = excluded.summary,
         before_json = excluded.before_json,
         after_json = excluded.after_json,
         undone = excluded.undone,
         reason_code = excluded.reason_code,
         reason_detail = excluded.reason_detail,
         affected_node_ids = excluded.affected_node_ids,
         affected_edge_ids = excluded.affected_edge_ids,
         edge_migrations = excluded.edge_migrations`,
    ).run(
      entry.id,
      entry.at,
      entry.kind,
      entry.summary,
      JSON.stringify(entry.before),
      JSON.stringify(entry.after),
      entry.undone ? 1 : 0,
      entry.reasonCode ?? "manual",
      entry.reasonDetail ?? "",
      JSON.stringify(entry.affectedNodeIds ?? []),
      JSON.stringify(entry.affectedEdgeIds ?? []),
      JSON.stringify(entry.edgeMigrations ?? []),
    );
  }

  setGraphHistoryUndone(id: string): void {
    this.requireDb().prepare("UPDATE graph_history SET undone = 1 WHERE id = ?").run(id);
  }

  listLearningTraces(): LearningTrace[] {
    const db = this.requireDb();
    const rows = db
      .prepare(
        `SELECT id, concept_ref AS conceptRef, kind, at, session_id AS sessionId,
                metadata_json AS metadataJson
         FROM learning_traces ORDER BY at ASC`,
      )
      .all() as Array<{
      id: string;
      conceptRef: string;
      kind: LearningTrace["kind"];
      at: string;
      sessionId: string;
      metadataJson: string;
    }>;
    return rows.map(mapStoredLearningTraceRow);
  }

  saveLearningTrace(trace: LearningTrace): void {
    const db = this.requireDb();
    db.prepare(
      `INSERT INTO learning_traces (id, concept_ref, kind, at, session_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         concept_ref = excluded.concept_ref,
         kind = excluded.kind,
         at = excluded.at,
         session_id = excluded.session_id,
         metadata_json = excluded.metadata_json`,
    ).run(
      trace.id,
      trace.conceptRef,
      trace.kind,
      trace.at,
      trace.sessionId,
      serializeLearningTraceMetadata(trace.metadata),
    );
  }

  listCognitiveActions(): CognitiveAction[] {
    const db = this.requireDb();
    const rows = db
      .prepare(
        `SELECT id, kind, title, body_md AS bodyMd, citations_json AS citationsJson,
                metadata_json AS metadataJson, permission_level AS permissionLevel,
                status, created_at AS createdAt
         FROM cognitive_actions ORDER BY created_at DESC`,
      )
      .all() as Array<{
      id: string;
      kind: CognitiveAction["kind"];
      title: string;
      bodyMd: string;
      citationsJson: string;
      metadataJson: string;
      permissionLevel: CognitiveAction["permissionLevel"];
      status: CognitiveAction["status"];
      createdAt: string;
    }>;
    return rows.map(mapStoredCognitiveActionRow);
  }

  saveCognitiveAction(action: CognitiveAction): void {
    const db = this.requireDb();
    db.prepare(
      `INSERT INTO cognitive_actions (id, kind, title, body_md, citations_json,
                                      metadata_json, permission_level, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         kind = excluded.kind,
         title = excluded.title,
         body_md = excluded.body_md,
         citations_json = excluded.citations_json,
         metadata_json = excluded.metadata_json,
         permission_level = excluded.permission_level,
         status = excluded.status,
         created_at = excluded.created_at`,
    ).run(
      action.id,
      action.kind,
      action.title,
      action.bodyMarkdown,
      serializeCognitiveActionCitations(action.citations),
      serializeCognitiveActionMetadata(action.metadata),
      action.permissionLevel,
      action.status,
      action.createdAt,
    );
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
