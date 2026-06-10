import Database from "@tauri-apps/plugin-sql";

import type { TauriSqlDatabaseLike } from "./tauriSqlDatabase";

import type { BrainGraphSnapshot, BrainNode, ConceptNode, GraphEdge } from "@/domain/graph";
import { isDecisionNode, isProjectNode, isQuestionNode, isSkillNode, isSourceNode, type QuestionStatus } from "@/domain/graph";
import type { DecisionNode } from "@/domain/nodes/decisionNode";
import type { ProjectNode } from "@/domain/nodes/projectNode";
import type { QuestionNode } from "@/domain/nodes/questionNode";
import type { SkillNode } from "@/domain/nodes/skillNode";
import type { SourceNode } from "@/domain/nodes/sourceNode";
import type { SourceRefKind } from "@/domain/graph/sourceRef";

import { DEFAULT_USER_PROFILE, type UserProfile } from "@/domain/profile";
import {
  parseProfileExtensionFields,
  serializeProfileExtensionFields,
} from "@/domain/profile/profileStorageFields";

import type { ProposalEnvelope, ProposalStatus } from "@/agent/types";

import { INITIAL_MIGRATION_SQL, STORAGE_DB_NAME } from "../migrations";

import type { CognitiveAction } from "@/domain/actions/cognitiveAction";
import {
  mapStoredCognitiveActionRow,
  serializeCognitiveActionCitations,
  serializeCognitiveActionMetadata,
} from "@/domain/actions/cognitiveAction";
import type { LearningTrace } from "@/domain/learning/learningTrace";
import { serializeLearningTraceMetadata } from "@/domain/learning/learningTrace";
import { mapStoredLearningTraceRow } from "@/learning/learningTraceStore";
import {
  migrateCognitiveActionsMetadataColumnTauri,
  migrateCognitiveActionsTableTauri,
  migrateConceptSalienceColumnsTauri,
  migrateConceptTemporalColumnsTauri,
  migrateGraphHistoryProvenanceTauri,
  migrateGraphHistoryTableTauri,
  migrateConceptSourceRefsColumnsTauri,
  migrateEdgeArchivedColumnTauri,
  migrateLearningTracesTableTauri,
  migrateBriefingFeedbackTableTauri,
  applyGraphSchemaMigrationsTauri,
} from "../schemaMigrations";
import type {
  CurationReasonCode,
  GraphHistoryEntry,
} from "@/domain/graphHistory";
import { normalizeGraphHistoryEntry } from "@/domain/graphHistory";

import {
  normalizeConceptProvenance,
  parseSourceRefsJson,
  serializeSourceRefsJson,
} from "@/domain/graph/sourceRef";
import { normalizeConceptSalience } from "@/lib/salience";

import {

  assertProposalStatus,

  assertProposalStatusUpdated,

  LIST_PENDING_PROPOSALS_SQL,

  mapStoredProposalRows,

  prepareProposalUpsertRow,

  type StoredProposalRow,

} from "../proposalPersistence";

import {
  briefingFeedbackToStoredRow,
  LIST_BRIEFING_FEEDBACK_SQL,
  mapStoredBriefingFeedbackRows,
  type StoredBriefingFeedbackRow,
} from "../briefingFeedbackRepo";
import type { BriefingFeedback } from "@/domain/radar/briefingItem";

import type { StorageProvider } from "../types";

function parseStringArrayJson(json: string | null | undefined): string[] {
  if (!json) {
    return [];
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => String(item).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function serializeStringArrayJson(values: string[]): string {
  return JSON.stringify(values);
}



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
    await migrateConceptTemporalColumnsTauri(this.db);
    await migrateGraphHistoryTableTauri(this.db);
    await migrateGraphHistoryProvenanceTauri(this.db);
    await migrateLearningTracesTableTauri(this.db);
    await migrateCognitiveActionsTableTauri(this.db);
    await migrateCognitiveActionsMetadataColumnTauri(this.db);
    await migrateConceptSourceRefsColumnsTauri(this.db);
    await migrateEdgeArchivedColumnTauri(this.db);
    await migrateBriefingFeedbackTableTauri(this.db);
    await applyGraphSchemaMigrationsTauri(this.db);

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

      edges: this.filterVisibleEdges(snapshot.edges, activeIds),

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



  async loadGraphForDisplay(): Promise<BrainGraphSnapshot> {

    const snapshot = await this.loadAllConceptsAndEdges();

    const conceptIds = new Set(snapshot.nodes.map((node) => node.id));

    return {

      nodes: snapshot.nodes,

      edges: this.filterVisibleEdges(snapshot.edges, conceptIds),

    };

  }



  private async loadAllConceptsAndEdges(): Promise<BrainGraphSnapshot> {

    const db = this.requireDb();

    const conceptRows = await db.select<

      Array<
        Omit<ConceptNode, "archived" | "sourceRefs"> & {
          archived: number;
          sourceRefsJson?: string | null;
          archivedAt?: string | null;
          supersedesNodeId?: string | null;
        }
      >

    >(

      `SELECT id, title, intro, source_url AS sourceUrl, source_refs_json AS sourceRefsJson,
              archived, created_at AS createdAt, updated_at AS updatedAt,
              salience, last_touched_at AS lastTouchedAt,
              archived_at AS archivedAt, supersedes_node_id AS supersedesNodeId
       FROM concepts`,

    );

    const projectRows = await db.select<
      Array<
        Omit<ProjectNode, "archived" | "sourceRefs" | "nodeKind"> & {
          archived: number;
          sourceRefsJson?: string | null;
        }
      >
    >(
      `SELECT id, title, intro, source_refs_json AS sourceRefsJson,
              archived, created_at AS createdAt, updated_at AS updatedAt
       FROM projects`,
    );

    let sourceRows: Array<
      Omit<SourceNode, "archived" | "nodeKind"> & { archived: number }
    > = [];
    try {
      sourceRows = await db.select<typeof sourceRows>(
        `SELECT id, title, intro, url, kind, world_item_id AS worldItemId,
                ingested_at AS ingestedAt, archived,
                created_at AS createdAt, updated_at AS updatedAt
         FROM sources`,
      );
    } catch {
      sourceRows = [];
    }

    let decisionRows: Array<
      Omit<DecisionNode, "archived" | "sourceRefs" | "alternativesConsidered" | "nodeKind"> & {
        archived: number;
        alternativesConsideredJson?: string | null;
        sourceRefsJson?: string | null;
      }
    > = [];
    try {
      decisionRows = await db.select<typeof decisionRows>(
        `SELECT id, title, rationale, alternatives_considered_json AS alternativesConsideredJson,
                source_refs_json AS sourceRefsJson, archived,
                created_at AS createdAt, updated_at AS updatedAt
         FROM decisions`,
      );
    } catch {
      decisionRows = [];
    }

    let questionRows: Array<
      Omit<QuestionNode, "archived" | "sourceRefs" | "nodeKind"> & {
        archived: number;
        sourceRefsJson?: string | null;
      }
    > = [];
    try {
      questionRows = await db.select<typeof questionRows>(
        `SELECT id, title, prompt, context, status, source_refs_json AS sourceRefsJson,
                archived, created_at AS createdAt, updated_at AS updatedAt
         FROM questions`,
      );
    } catch {
      questionRows = [];
    }

    let skillRows: Array<
      Omit<SkillNode, "archived" | "sourceRefs" | "nodeKind"> & {
        archived: number;
        sourceRefsJson?: string | null;
      }
    > = [];
    try {
      skillRows = await db.select<typeof skillRows>(
        `SELECT id, name, title, intro, proficiency, review_cadence AS reviewCadence,
                source_refs_json AS sourceRefsJson, archived,
                created_at AS createdAt, updated_at AS updatedAt
         FROM skills`,
      );
    } catch {
      skillRows = [];
    }



    const edges = await db.select<
      Array<Omit<GraphEdge, "archived"> & { archived: number }>
    >(

      `SELECT id, source_id AS sourceId, target_id AS targetId,

              relation_type AS relationType, archived

       FROM edges`,

    );



    const conceptNodes: BrainNode[] = conceptRows.map((row) =>
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
    );

    const projectNodes: BrainNode[] = projectRows.map((row) => ({
      nodeKind: "project" as const,
      id: row.id,
      title: row.title,
      intro: row.intro,
      sourceRefs: parseSourceRefsJson(row.sourceRefsJson),
      archived: row.archived === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    const sourceNodes: BrainNode[] = sourceRows.map((row) => ({
      nodeKind: "source" as const,
      id: row.id,
      title: row.title,
      intro: row.intro,
      url: row.url ?? null,
      kind: row.kind as SourceRefKind,
      ...(row.worldItemId ? { worldItemId: row.worldItemId } : {}),
      ingestedAt: row.ingestedAt,
      archived: row.archived === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    const decisionNodes: BrainNode[] = decisionRows.map((row) => ({
      nodeKind: "decision" as const,
      id: row.id,
      title: row.title,
      intro: row.rationale,
      rationale: row.rationale,
      alternativesConsidered: parseStringArrayJson(row.alternativesConsideredJson),
      sourceRefs: parseSourceRefsJson(row.sourceRefsJson),
      archived: row.archived === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    const questionNodes: BrainNode[] = questionRows.map((row) => ({
      nodeKind: "question" as const,
      id: row.id,
      title: row.title,
      intro: row.context || row.prompt,
      prompt: row.prompt,
      context: row.context,
      status: row.status as QuestionStatus,
      sourceRefs: parseSourceRefsJson(row.sourceRefsJson),
      archived: row.archived === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    const skillNodes: BrainNode[] = skillRows.map((row) => ({
      nodeKind: "skill" as const,
      id: row.id,
      name: row.name,
      title: row.title,
      intro: row.intro,
      proficiency: row.proficiency,
      reviewCadence: row.reviewCadence,
      sourceRefs: parseSourceRefsJson(row.sourceRefsJson),
      archived: row.archived === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    const nodes = [
      ...conceptNodes,
      ...projectNodes,
      ...sourceNodes,
      ...decisionNodes,
      ...questionNodes,
      ...skillNodes,
    ];
    const nodeIds = new Set(nodes.map((node) => node.id));

    const displayEdges = this.filterVisibleEdges(

      edges.map((row) => ({

        ...row,

        archived: row.archived === 1,

      })),

      nodeIds,

    );



    return { nodes, edges: displayEdges };

  }



  async saveConcept(node: ConceptNode): Promise<void> {
    if (
      isProjectNode(node) ||
      isSourceNode(node) ||
      isDecisionNode(node) ||
      isQuestionNode(node) ||
      isSkillNode(node)
    ) {
      throw new Error("saveConcept called with non-concept node");
    }

    const db = this.requireDb();

    await db.execute(

      `INSERT INTO concepts (id, title, intro, source_url, source_refs_json, archived, created_at, updated_at,
                            salience, last_touched_at, archived_at, supersedes_node_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT(id) DO UPDATE SET
         title = $2,
         intro = $3,
         source_url = $4,
         source_refs_json = $5,
         archived = $6,
         updated_at = $8,
         salience = $9,
         last_touched_at = $10,
         archived_at = $11,
         supersedes_node_id = $12`,

      (() => {
        const normalized = normalizeConceptProvenance(normalizeConceptSalience(node));
        return [
        normalized.id,
        normalized.title,
        normalized.intro,
        normalized.sourceUrl,
        serializeSourceRefsJson(normalized.sourceRefs ?? []),
        normalized.archived ? 1 : 0,
        normalized.createdAt,
        normalized.updatedAt,
        normalized.salience ?? 1,
        normalized.lastTouchedAt ?? normalized.updatedAt,
        normalized.archivedAt ?? null,
        normalized.supersedesNodeId ?? null,
      ];
      })(),

    );

  }



  async saveProject(node: ProjectNode): Promise<void> {

    const db = this.requireDb();

    await db.execute(

      `INSERT INTO projects (id, title, intro, source_refs_json, archived, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT(id) DO UPDATE SET
         title = $2,
         intro = $3,
         source_refs_json = $4,
         archived = $5,
         updated_at = $7`,

      [
        node.id,
        node.title,
        node.intro,
        serializeSourceRefsJson(node.sourceRefs ?? []),
        node.archived ? 1 : 0,
        node.createdAt,
        node.updatedAt,
      ],

    );

  }

  async saveSource(node: SourceNode): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO sources (id, title, intro, url, kind, world_item_id, ingested_at, archived, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT(id) DO UPDATE SET
         title = $2,
         intro = $3,
         url = $4,
         kind = $5,
         world_item_id = $6,
         ingested_at = $7,
         archived = $8,
         updated_at = $10`,
      [
        node.id,
        node.title,
        node.intro,
        node.url,
        node.kind,
        node.worldItemId ?? null,
        node.ingestedAt,
        node.archived ? 1 : 0,
        node.createdAt,
        node.updatedAt,
      ],
    );
  }

  async saveDecision(node: DecisionNode): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO decisions (id, title, rationale, alternatives_considered_json, source_refs_json, archived, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(id) DO UPDATE SET
         title = $2,
         rationale = $3,
         alternatives_considered_json = $4,
         source_refs_json = $5,
         archived = $6,
         updated_at = $8`,
      [
        node.id,
        node.title,
        node.rationale,
        serializeStringArrayJson(node.alternativesConsidered),
        serializeSourceRefsJson(node.sourceRefs ?? []),
        node.archived ? 1 : 0,
        node.createdAt,
        node.updatedAt,
      ],
    );
  }

  async saveQuestion(node: QuestionNode): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO questions (id, title, prompt, context, status, source_refs_json, archived, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         title = $2,
         prompt = $3,
         context = $4,
         status = $5,
         source_refs_json = $6,
         archived = $7,
         updated_at = $9`,
      [
        node.id,
        node.title,
        node.prompt,
        node.context,
        node.status,
        serializeSourceRefsJson(node.sourceRefs ?? []),
        node.archived ? 1 : 0,
        node.createdAt,
        node.updatedAt,
      ],
    );
  }

  async saveSkill(node: SkillNode): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO skills (id, name, title, intro, proficiency, review_cadence, source_refs_json, archived, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT(id) DO UPDATE SET
         name = $2,
         title = $3,
         intro = $4,
         proficiency = $5,
         review_cadence = $6,
         source_refs_json = $7,
         archived = $8,
         updated_at = $10`,
      [
        node.id,
        node.name,
        node.title,
        node.intro,
        node.proficiency,
        node.reviewCadence,
        serializeSourceRefsJson(node.sourceRefs ?? []),
        node.archived ? 1 : 0,
        node.createdAt,
        node.updatedAt,
      ],
    );
  }



  async saveEdge(edge: GraphEdge): Promise<void> {

    const db = this.requireDb();

    await db.execute(

      `INSERT INTO edges (id, source_id, target_id, relation_type, archived)

       VALUES ($1, $2, $3, $4, $5)

       ON CONFLICT(id) DO UPDATE SET

         source_id = $2,

         target_id = $3,

         relation_type = $4,

         archived = $5`,

      [
        edge.id,
        edge.sourceId,
        edge.targetId,
        edge.relationType,
        edge.archived ? 1 : 0,
      ],

    );

  }



  async deleteEdge(edgeId: string): Promise<void> {

    const db = this.requireDb();

    await db.execute("DELETE FROM edges WHERE id = $1", [edgeId]);

  }



  async syncEdgesSnapshot(edges: GraphEdge[]): Promise<void> {

    const db = this.requireDb();

    const keepIds = new Set(edges.map((edge) => edge.id));

    const existing = (await db.select<Array<{ id: string }>>(
      "SELECT id FROM edges",
    )) ?? [];

    for (const row of existing) {

      if (!keepIds.has(row.id)) {

        await db.execute("UPDATE edges SET archived = 1 WHERE id = $1", [

          row.id,

        ]);

      }

    }

    for (const edge of edges) {

      await this.saveEdge({ ...edge, archived: false });

    }

  }



  async deleteConcept(conceptId: string): Promise<void> {

    const db = this.requireDb();

    await db.execute(

      "DELETE FROM edges WHERE source_id = $1 OR target_id = $1",

      [conceptId],

    );

    await db.execute("DELETE FROM concepts WHERE id = $1", [conceptId]);

  }



  async deleteProject(projectId: string): Promise<void> {

    const db = this.requireDb();

    await db.execute(

      "DELETE FROM edges WHERE source_id = $1 OR target_id = $1",

      [projectId],

    );

    await db.execute("DELETE FROM projects WHERE id = $1", [projectId]);

  }

  async deleteSource(sourceId: string): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      "DELETE FROM edges WHERE source_id = $1 OR target_id = $1",
      [sourceId],
    );
    await db.execute("DELETE FROM sources WHERE id = $1", [sourceId]);
  }

  async deleteDecision(decisionId: string): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      "DELETE FROM edges WHERE source_id = $1 OR target_id = $1",
      [decisionId],
    );
    await db.execute("DELETE FROM decisions WHERE id = $1", [decisionId]);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      "DELETE FROM edges WHERE source_id = $1 OR target_id = $1",
      [questionId],
    );
    await db.execute("DELETE FROM questions WHERE id = $1", [questionId]);
  }

  async deleteSkill(skillId: string): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      "DELETE FROM edges WHERE source_id = $1 OR target_id = $1",
      [skillId],
    );
    await db.execute("DELETE FROM skills WHERE id = $1", [skillId]);
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

    const extensions = parseProfileExtensionFields(map);

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

      ...extensions,

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

      ...serializeProfileExtensionFields(profile),

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
        reason_code?: string | null;
        reason_detail?: string | null;
        affected_node_ids?: string | null;
        affected_edge_ids?: string | null;
        edge_migrations?: string | null;
      }>
    >(
      `SELECT id, at, kind, summary, before_json, after_json, undone,
              reason_code, reason_detail, affected_node_ids,
              affected_edge_ids, edge_migrations
       FROM graph_history ORDER BY at DESC`,
    );
    return rows.map((row) =>
      normalizeGraphHistoryEntry({
        id: row.id,
        at: row.at,
        kind: row.kind,
        summary: row.summary,
        before: JSON.parse(row.before_json),
        after: JSON.parse(row.after_json),
        reasonCode: (row.reason_code ?? "manual") as CurationReasonCode,
        reasonDetail: row.reason_detail ?? "",
        affectedNodeIds: JSON.parse(row.affected_node_ids ?? "[]") as string[],
        affectedEdgeIds: JSON.parse(row.affected_edge_ids ?? "[]") as string[],
        edgeMigrations: JSON.parse(row.edge_migrations ?? "[]") as GraphHistoryEntry["edgeMigrations"],
        undone: row.undone === 1 ? true : undefined,
      }),
    );
  }

  async saveGraphHistoryEntry(entry: GraphHistoryEntry): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO graph_history (id, at, kind, summary, before_json, after_json, undone,
                                  reason_code, reason_detail, affected_node_ids,
                                  affected_edge_ids, edge_migrations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
      [
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
      ],
    );
  }

  async setGraphHistoryUndone(id: string): Promise<void> {
    await this.requireDb().execute(
      "UPDATE graph_history SET undone = 1 WHERE id = $1",
      [id],
    );
  }

  async listLearningTraces(): Promise<LearningTrace[]> {
    const db = this.requireDb();
    const rows = await db.select<
      Array<{
        id: string;
        concept_ref: string;
        kind: LearningTrace["kind"];
        at: string;
        session_id: string;
        metadata_json: string;
      }>
    >(
      `SELECT id, concept_ref, kind, at, session_id, metadata_json
       FROM learning_traces ORDER BY at ASC`,
    );
    return rows.map((row) =>
      mapStoredLearningTraceRow({
        id: row.id,
        conceptRef: row.concept_ref,
        kind: row.kind,
        at: row.at,
        sessionId: row.session_id,
        metadataJson: row.metadata_json,
      }),
    );
  }

  async saveLearningTrace(trace: LearningTrace): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO learning_traces (id, concept_ref, kind, at, session_id, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(id) DO UPDATE SET
         concept_ref = excluded.concept_ref,
         kind = excluded.kind,
         at = excluded.at,
         session_id = excluded.session_id,
         metadata_json = excluded.metadata_json`,
      [
        trace.id,
        trace.conceptRef,
        trace.kind,
        trace.at,
        trace.sessionId,
        serializeLearningTraceMetadata(trace.metadata),
      ],
    );
  }

  async listCognitiveActions(): Promise<CognitiveAction[]> {
    const db = this.requireDb();
    const rows = await db.select<
      Array<{
        id: string;
        kind: CognitiveAction["kind"];
        title: string;
        body_md: string;
        citations_json: string;
        metadata_json: string;
        permission_level: CognitiveAction["permissionLevel"];
        status: CognitiveAction["status"];
        created_at: string;
      }>
    >(
      `SELECT id, kind, title, body_md, citations_json, metadata_json,
              permission_level, status, created_at
       FROM cognitive_actions ORDER BY created_at DESC`,
    );
    return rows.map((row) =>
      mapStoredCognitiveActionRow({
        id: row.id,
        kind: row.kind,
        title: row.title,
        bodyMd: row.body_md,
        citationsJson: row.citations_json,
        metadataJson: row.metadata_json,
        permissionLevel: row.permission_level,
        status: row.status,
        createdAt: row.created_at,
      }),
    );
  }

  async saveCognitiveAction(action: CognitiveAction): Promise<void> {
    const db = this.requireDb();
    await db.execute(
      `INSERT INTO cognitive_actions (id, kind, title, body_md, citations_json,
                                      metadata_json, permission_level, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT(id) DO UPDATE SET
         kind = excluded.kind,
         title = excluded.title,
         body_md = excluded.body_md,
         citations_json = excluded.citations_json,
         metadata_json = excluded.metadata_json,
         permission_level = excluded.permission_level,
         status = excluded.status,
         created_at = excluded.created_at`,
      [
        action.id,
        action.kind,
        action.title,
        action.bodyMarkdown,
        serializeCognitiveActionCitations(action.citations),
        serializeCognitiveActionMetadata(action.metadata),
        action.permissionLevel,
        action.status,
        action.createdAt,
      ],
    );
  }

  async listBriefingFeedback(): Promise<BriefingFeedback[]> {
    const db = this.requireDb();
    const rows = await db.select<StoredBriefingFeedbackRow[]>(
      LIST_BRIEFING_FEEDBACK_SQL,
    );
    return mapStoredBriefingFeedbackRows(rows);
  }

  async saveBriefingFeedback(feedback: BriefingFeedback): Promise<void> {
    const db = this.requireDb();
    const row = briefingFeedbackToStoredRow(feedback);
    await db.execute(
      `INSERT INTO briefing_feedback (id, world_item_id, kind, at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT(id) DO UPDATE SET
         world_item_id = excluded.world_item_id,
         kind = excluded.kind,
         at = excluded.at`,
      [row.id, row.world_item_id, row.kind, row.at],
    );
  }

  /** KP-07: scoped write transaction for graph + history co-persist. */
  async runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const db = this.requireDb();
    await db.execute("BEGIN IMMEDIATE");
    try {
      const result = await fn();
      await db.execute("COMMIT");
      return result;
    } catch (error) {
      try {
        await db.execute("ROLLBACK");
      } catch {
        // ignore nested rollback failure
      }
      throw error;
    }
  }

  private requireDb(): TauriSqlDatabase {

    if (!this.db) {

      throw new Error("TauriSqlStorageProvider is not initialized");

    }

    return this.db;

  }

}

