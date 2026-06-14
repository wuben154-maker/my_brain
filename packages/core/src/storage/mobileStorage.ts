import type { AdaptiveSignal } from "../domain/adaptiveSignal.js";
import type { UserModeProfile } from "../domain/userMode.js";
import { GraphTransactionError, SchemaMigrationError } from "../errors/index.js";
import type { GraphChangeRecord, GraphSnapshot } from "../graph/types.js";
import type { ProfileCorrectionState } from "../profile/correctionHistory.js";
import type { ProvisionalCandidate } from "../provisional/types.js";
import {
  MOBILE_INITIAL_MIGRATION_SQL,
  SCHEMA_VERSION_META_KEY,
  STORAGE_SCHEMA_VERSION,
} from "./schema.js";
import type { SqlDriver } from "./sqlDriver.js";

export interface LearningTraceRecord {
  id: string;
  topic: string;
  note: string;
  createdAt: string;
}

export interface WorldItemRecord {
  id: string;
  title: string;
  freshness: number;
  updatedAt: string;
}

export interface PendingIngestProposal {
  id: string;
  concept: string;
  intro: string;
  sourceLinks: string[];
  signalId?: string;
  createdAt: string;
}

export interface ProviderConfigSnapshot {
  llm: "mock" | "live" | "degraded";
  radar: "live" | "fixture" | "degraded";
  voice: "disconnected" | "connected" | "mock";
  storage: "ready" | "migrating" | "degraded";
  lastErrorCode?: string;
}

export interface MobilePersistedBundle {
  profile: UserModeProfile | null;
  coldStartComplete: boolean;
  correctionState: ProfileCorrectionState;
  graph: GraphSnapshot;
  history: GraphChangeRecord[];
  provisional: ProvisionalCandidate[];
  pendingIngest: PendingIngestProposal | null;
  signals: AdaptiveSignal[];
  learningTraces: LearningTraceRecord[];
  worldItems: WorldItemRecord[];
  providerConfig: ProviderConfigSnapshot;
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export class MobileStorage {
  constructor(private readonly driver: SqlDriver) {}

  migrate(): void {
    this.driver.exec(MOBILE_INITIAL_MIGRATION_SQL);
    const current = this.getMeta(SCHEMA_VERSION_META_KEY);
    const version = current ? Number.parseInt(current, 10) : 0;
    if (Number.isNaN(version) || version > STORAGE_SCHEMA_VERSION) {
      throw new SchemaMigrationError(
        version,
        `unsupported schema version ${String(version)}`,
      );
    }
    if (version < STORAGE_SCHEMA_VERSION) {
      this.setMeta(SCHEMA_VERSION_META_KEY, String(STORAGE_SCHEMA_VERSION));
    }
  }

  getSchemaVersion(): number {
    const raw = this.getMeta(SCHEMA_VERSION_META_KEY);
    return raw ? Number.parseInt(raw, 10) : 0;
  }

  getMeta(key: string): string | null {
    const row = this.driver.queryOne<{ value: string }>(
      "SELECT value FROM app_meta WHERE key = ?",
      [key],
    );
    return row?.value ?? null;
  }

  setMeta(key: string, value: string): void {
    this.driver.exec(
      "INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value],
    );
  }

  saveGraphSnapshot(snapshot: GraphSnapshot): void {
    this.driver.runInTransaction(() => {
      this.driver.exec("DELETE FROM graph_edges");
      this.driver.exec("DELETE FROM graph_nodes");
      for (const node of snapshot.nodes) {
        this.driver.exec(
          `INSERT INTO graph_nodes (id, concept, intro, source_links_json, archived, created_at, confirmed_at, ingest_source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            node.id,
            node.concept,
            node.intro,
            JSON.stringify(node.sourceLinks),
            node.archived ? 1 : 0,
            node.createdAt,
            null,
            null,
          ],
        );
      }
      for (const edge of snapshot.edges) {
        this.driver.exec(
          "INSERT INTO graph_edges (id, from_id, to_id, relation) VALUES (?, ?, ?, ?)",
          [edge.id, edge.fromId, edge.toId, edge.relation],
        );
      }
    });
  }

  loadGraphSnapshot(): GraphSnapshot {
    const nodes = this.driver
      .queryAll<{
        id: string;
        concept: string;
        intro: string;
        source_links_json: string;
        archived: number;
        created_at: string;
      }>("SELECT id, concept, intro, source_links_json, archived, created_at FROM graph_nodes")
      .map((row) => ({
        id: row.id,
        concept: row.concept,
        intro: row.intro,
        sourceLinks: parseJson<string[]>(row.source_links_json, []),
        archived: row.archived === 1,
        createdAt: row.created_at,
      }));
    const edges = this.driver
      .queryAll<{
        id: string;
        from_id: string;
        to_id: string;
        relation: string;
      }>("SELECT id, from_id, to_id, relation FROM graph_edges")
      .map((row) => ({
        id: row.id,
        fromId: row.from_id,
        toId: row.to_id,
        relation: row.relation,
      }));
    return { nodes, edges };
  }

  saveHistoryEntry(entry: GraphChangeRecord): void {
    this.driver.exec(
      `INSERT INTO graph_history (id, kind, summary, before_json, after_json, created_at, undone)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET undone = excluded.undone`,
      [
        entry.id,
        entry.kind,
        entry.summary,
        JSON.stringify(entry.before),
        JSON.stringify(entry.after),
        entry.createdAt,
        entry.undone ? 1 : 0,
      ],
    );
  }

  loadHistory(): GraphChangeRecord[] {
    return this.driver
      .queryAll<{
        id: string;
        kind: GraphChangeRecord["kind"];
        summary: string;
        before_json: string;
        after_json: string;
        created_at: string;
        undone: number;
      }>(
        "SELECT id, kind, summary, before_json, after_json, created_at, undone FROM graph_history ORDER BY created_at",
      )
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        summary: row.summary,
        before: parseJson<GraphSnapshot>(row.before_json, { nodes: [], edges: [] }),
        after: parseJson<GraphSnapshot>(row.after_json, { nodes: [], edges: [] }),
        createdAt: row.created_at,
        undone: row.undone === 1,
      }));
  }

  coTransactGraphAndHistory(
    before: GraphSnapshot,
    after: GraphSnapshot,
    entry: GraphChangeRecord,
  ): void {
    try {
      this.driver.runInTransaction(() => {
        this.saveGraphSnapshot(after);
        this.saveHistoryEntry(entry);
      });
    } catch (error) {
      throw new GraphTransactionError(
        error instanceof Error ? error.message : "coTransact failed",
      );
    }
    const loaded = this.loadGraphSnapshot();
    if (loaded.nodes.length !== after.nodes.length) {
      throw new GraphTransactionError("graph snapshot mismatch after coTransact");
    }
  }

  saveUserModeProfile(profile: UserModeProfile | null, coldStartComplete: boolean): void {
    if (!profile) {
      this.driver.exec("DELETE FROM user_mode_profile");
      return;
    }
    this.driver.exec(
      `INSERT INTO user_mode_profile (id, profile_json, cold_start_complete, profile_version)
       VALUES (1, ?, ?, 1)
       ON CONFLICT(id) DO UPDATE SET
         profile_json = excluded.profile_json,
         cold_start_complete = excluded.cold_start_complete`,
      [JSON.stringify(profile), coldStartComplete ? 1 : 0],
    );
  }

  loadUserModeProfile(): { profile: UserModeProfile | null; coldStartComplete: boolean } {
    const row = this.driver.queryOne<{
      profile_json: string;
      cold_start_complete: number;
    }>("SELECT profile_json, cold_start_complete FROM user_mode_profile WHERE id = 1");
    if (!row) {
      return { profile: null, coldStartComplete: false };
    }
    return {
      profile: parseJson<UserModeProfile | null>(row.profile_json, null),
      coldStartComplete: row.cold_start_complete === 1,
    };
  }

  saveCorrectionState(state: ProfileCorrectionState): void {
    this.driver.runInTransaction(() => {
      this.driver.exec("DELETE FROM profile_correction_history");
      this.driver.exec("DELETE FROM profile_suppression_list");
      this.driver.exec("DELETE FROM profile_traits");
      for (const record of state.corrections) {
        this.driver.exec(
          "INSERT INTO profile_correction_history (trait_id, action, at, note) VALUES (?, ?, ?, ?)",
          [record.traitId, record.action, record.at, record.note ?? null],
        );
      }
      for (const traitId of state.suppressionList) {
        this.driver.exec(
          "INSERT INTO profile_suppression_list (trait_id) VALUES (?)",
          [traitId],
        );
      }
      for (const trait of state.traits) {
        this.driver.exec(
          "INSERT INTO profile_traits (id, label, source, suppressed) VALUES (?, ?, ?, ?)",
          [trait.id, trait.label, trait.source, trait.suppressed ? 1 : 0],
        );
      }
    });
  }

  loadCorrectionState(): ProfileCorrectionState {
    const corrections = this.driver
      .queryAll<{
        trait_id: string;
        action: ProfileCorrectionState["corrections"][number]["action"];
        at: string;
        note: string | null;
      }>("SELECT trait_id, action, at, note FROM profile_correction_history ORDER BY id")
      .map((row) => ({
        traitId: row.trait_id,
        action: row.action,
        at: row.at,
        note: row.note ?? undefined,
      }));
    const suppressionList = this.driver
      .queryAll<{ trait_id: string }>("SELECT trait_id FROM profile_suppression_list")
      .map((row) => row.trait_id);
    const traits = this.driver
      .queryAll<{
        id: string;
        label: string;
        source: ProfileCorrectionState["traits"][number]["source"];
        suppressed: number;
      }>("SELECT id, label, source, suppressed FROM profile_traits")
      .map((row) => ({
        id: row.id,
        label: row.label,
        source: row.source,
        suppressed: row.suppressed === 1,
      }));
    return { traits, corrections, suppressionList };
  }

  saveProvisionalCandidates(candidates: ProvisionalCandidate[]): void {
    this.driver.runInTransaction(() => {
      this.driver.exec("DELETE FROM provisional_candidates");
      for (const candidate of candidates) {
        this.driver.exec(
          "INSERT INTO provisional_candidates (id, payload_json, status, created_at) VALUES (?, ?, ?, ?)",
          [
            candidate.id,
            JSON.stringify(candidate),
            candidate.status,
            candidate.createdAt,
          ],
        );
      }
    });
  }

  loadProvisionalCandidates(): ProvisionalCandidate[] {
    return this.driver
      .queryAll<{ payload_json: string }>(
        "SELECT payload_json FROM provisional_candidates ORDER BY created_at",
      )
      .map((row) => parseJson<ProvisionalCandidate>(row.payload_json, {
        id: "invalid",
        sourceType: "text",
        summary: "",
        evidenceRefs: [],
        createdAt: "",
        status: "pending",
      }))
      .filter((c) => c.id !== "invalid");
  }

  savePendingIngestProposal(proposal: PendingIngestProposal | null): void {
    this.driver.exec("DELETE FROM pending_ingest_proposals");
    if (!proposal) {
      return;
    }
    this.driver.exec(
      "INSERT INTO pending_ingest_proposals (id, payload_json, created_at) VALUES (?, ?, ?)",
      [proposal.id, JSON.stringify(proposal), proposal.createdAt],
    );
  }

  loadPendingIngestProposal(): PendingIngestProposal | null {
    const row = this.driver.queryOne<{ payload_json: string }>(
      "SELECT payload_json FROM pending_ingest_proposals LIMIT 1",
    );
    if (!row) {
      return null;
    }
    return parseJson<PendingIngestProposal | null>(row.payload_json, null);
  }

  saveAdaptiveSignals(signals: AdaptiveSignal[]): void {
    this.driver.exec(
      `INSERT INTO adaptive_radar_state (id, signals_json) VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET signals_json = excluded.signals_json`,
      [JSON.stringify(signals)],
    );
  }

  loadAdaptiveSignals(): AdaptiveSignal[] {
    const row = this.driver.queryOne<{ signals_json: string }>(
      "SELECT signals_json FROM adaptive_radar_state WHERE id = 1",
    );
    if (!row) {
      return [];
    }
    return parseJson<AdaptiveSignal[]>(row.signals_json, []);
  }

  saveLearningTraces(traces: LearningTraceRecord[]): void {
    this.driver.runInTransaction(() => {
      this.driver.exec("DELETE FROM learning_traces");
      for (const trace of traces) {
        this.driver.exec(
          "INSERT INTO learning_traces (id, payload_json, created_at) VALUES (?, ?, ?)",
          [trace.id, JSON.stringify(trace), trace.createdAt],
        );
      }
    });
  }

  loadLearningTraces(): LearningTraceRecord[] {
    return this.driver
      .queryAll<{ payload_json: string }>("SELECT payload_json FROM learning_traces")
      .map((row) => parseJson<LearningTraceRecord>(row.payload_json, {
        id: "",
        topic: "",
        note: "",
        createdAt: "",
      }))
      .filter((t) => t.id.length > 0);
  }

  saveWorldItems(items: WorldItemRecord[]): void {
    this.driver.runInTransaction(() => {
      this.driver.exec("DELETE FROM world_items");
      for (const item of items) {
        this.driver.exec(
          "INSERT INTO world_items (id, payload_json, updated_at) VALUES (?, ?, ?)",
          [item.id, JSON.stringify(item), item.updatedAt],
        );
      }
    });
  }

  loadWorldItems(): WorldItemRecord[] {
    return this.driver
      .queryAll<{ payload_json: string }>("SELECT payload_json FROM world_items")
      .map((row) => parseJson<WorldItemRecord>(row.payload_json, {
        id: "",
        title: "",
        freshness: 0,
        updatedAt: "",
      }))
      .filter((w) => w.id.length > 0);
  }

  saveProviderConfig(config: ProviderConfigSnapshot): void {
    this.driver.exec(
      `INSERT INTO provider_config (key, value_json) VALUES ('snapshot', ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
      [JSON.stringify(config)],
    );
  }

  loadProviderConfig(): ProviderConfigSnapshot {
    const row = this.driver.queryOne<{ value_json: string }>(
      "SELECT value_json FROM provider_config WHERE key = 'snapshot'",
    );
    return parseJson<ProviderConfigSnapshot>(row?.value_json ?? "", {
      llm: "mock",
      radar: "fixture",
      voice: "disconnected",
      storage: "ready",
    });
  }

  appendDiagnosticEvent(event: {
    intent: string;
    outcome: "ok" | "fail" | "degraded" | "skipped";
    reasonCode: string;
    userMode?: string;
    metadata?: Record<string, string | number>;
  }): void {
    const ts = new Date().toISOString();
    this.driver.exec(
      `INSERT INTO diagnostic_events (ts, intent, outcome, reason_code, user_mode, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        ts,
        event.intent,
        event.outcome,
        event.reasonCode,
        event.userMode ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ],
    );
    const count = this.driver.queryOne<{ c: number }>(
      "SELECT COUNT(*) as c FROM diagnostic_events",
    );
    if (count && count.c > 200) {
      this.driver.exec(
        "DELETE FROM diagnostic_events WHERE id NOT IN (SELECT id FROM diagnostic_events ORDER BY id DESC LIMIT 200)",
      );
    }
  }

  listDiagnosticEvents(): Array<{
    intent: string;
    outcome: string;
    reasonCode: string;
    userMode?: string;
    ts: string;
  }> {
    return this.driver
      .queryAll<{
        intent: string;
        outcome: string;
        reason_code: string;
        user_mode: string | null;
        ts: string;
      }>("SELECT intent, outcome, reason_code, user_mode, ts FROM diagnostic_events ORDER BY id")
      .map((row) => ({
        intent: row.intent,
        outcome: row.outcome,
        reasonCode: row.reason_code,
        userMode: row.user_mode ?? undefined,
        ts: row.ts,
      }));
  }

  hydrateBundle(): MobilePersistedBundle {
    const { profile, coldStartComplete } = this.loadUserModeProfile();
    return {
      profile,
      coldStartComplete,
      correctionState: this.loadCorrectionState(),
      graph: this.loadGraphSnapshot(),
      history: this.loadHistory(),
      provisional: this.loadProvisionalCandidates(),
      pendingIngest: this.loadPendingIngestProposal(),
      signals: this.loadAdaptiveSignals(),
      learningTraces: this.loadLearningTraces(),
      worldItems: this.loadWorldItems(),
      providerConfig: this.loadProviderConfig(),
    };
  }
}
