import type Database from "better-sqlite3";

interface TauriConceptMigrator {
  select<T>(sql: string, params?: unknown[]): Promise<T>;
  execute(sql: string, params?: unknown[]): Promise<unknown>;
}

/** App-meta key for graph schema version (KP-07 / KP-08+). */
export const GRAPH_SCHEMA_VERSION_META_KEY = "graph_schema_version";

/** Baseline graph schema version after KP-07 gate (concept + edge tables, no Project). */
export const GRAPH_SCHEMA_VERSION_BASELINE = 1;

/** KP-08 — minimal Project table (Source/Decision/Question/Skill are KP-10+). */
export const GRAPH_SCHEMA_VERSION_WITH_PROJECT = 2;

/** KP-10 — Source node table (Decision/Question/Skill are KP-11+). */
export const GRAPH_SCHEMA_VERSION_WITH_SOURCE = 3;

/** KP-11 — Decision node table. */
export const GRAPH_SCHEMA_VERSION_WITH_DECISION = 4;

/** KP-12 — Question node table. */
export const GRAPH_SCHEMA_VERSION_WITH_QUESTION = 5;

/** KP-13 — Skill node table (Phase 6 complete). */
export const GRAPH_SCHEMA_VERSION_WITH_SKILL = 6;

/** Latest graph schema version after all registered migrations. */
export const GRAPH_SCHEMA_VERSION_LATEST = GRAPH_SCHEMA_VERSION_WITH_SKILL;

const PROJECTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  intro TEXT NOT NULL DEFAULT '',
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const SOURCES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  intro TEXT NOT NULL DEFAULT '',
  url TEXT,
  kind TEXT NOT NULL DEFAULT 'manual',
  world_item_id TEXT,
  ingested_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const DECISIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL DEFAULT '',
  alternatives_considered_json TEXT NOT NULL DEFAULT '[]',
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const QUESTIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  context TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const SKILLS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  intro TEXT NOT NULL DEFAULT '',
  proficiency TEXT NOT NULL DEFAULT '',
  review_cadence TEXT NOT NULL DEFAULT '',
  source_refs_json TEXT NOT NULL DEFAULT '[]',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

function forwardSourcesTableSqlite(db: Database.Database): void {
  db.exec(SOURCES_TABLE_SQL);
}

function rollbackSourcesTableSqlite(db: Database.Database): void {
  if (sqliteTableExists(db, "edges") && sqliteTableExists(db, "sources")) {
    db.exec(
      "DELETE FROM edges WHERE source_id IN (SELECT id FROM sources) OR target_id IN (SELECT id FROM sources)",
    );
  }
  db.exec("DROP TABLE IF EXISTS sources");
}

async function forwardSourcesTableTauri(db: TauriConceptMigrator): Promise<void> {
  await db.execute(SOURCES_TABLE_SQL);
}

async function rollbackSourcesTableTauri(db: TauriConceptMigrator): Promise<void> {
  const edgeTable = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'edges'",
  );
  const sourceTable = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sources'",
  );
  if (edgeTable.length > 0 && sourceTable.length > 0) {
    await db.execute(
      "DELETE FROM edges WHERE source_id IN (SELECT id FROM sources) OR target_id IN (SELECT id FROM sources)",
    );
  }
  await db.execute("DROP TABLE IF EXISTS sources");
}

function forwardDecisionsTableSqlite(db: Database.Database): void {
  db.exec(DECISIONS_TABLE_SQL);
}

function rollbackDecisionsTableSqlite(db: Database.Database): void {
  if (sqliteTableExists(db, "edges") && sqliteTableExists(db, "decisions")) {
    db.exec(
      "DELETE FROM edges WHERE source_id IN (SELECT id FROM decisions) OR target_id IN (SELECT id FROM decisions)",
    );
  }
  db.exec("DROP TABLE IF EXISTS decisions");
}

async function forwardDecisionsTableTauri(db: TauriConceptMigrator): Promise<void> {
  await db.execute(DECISIONS_TABLE_SQL);
}

async function rollbackDecisionsTableTauri(db: TauriConceptMigrator): Promise<void> {
  const edgeTable = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'edges'",
  );
  const decisionTable = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'decisions'",
  );
  if (edgeTable.length > 0 && decisionTable.length > 0) {
    await db.execute(
      "DELETE FROM edges WHERE source_id IN (SELECT id FROM decisions) OR target_id IN (SELECT id FROM decisions)",
    );
  }
  await db.execute("DROP TABLE IF EXISTS decisions");
}

function forwardQuestionsTableSqlite(db: Database.Database): void {
  db.exec(QUESTIONS_TABLE_SQL);
}

function rollbackQuestionsTableSqlite(db: Database.Database): void {
  if (sqliteTableExists(db, "edges") && sqliteTableExists(db, "questions")) {
    db.exec(
      "DELETE FROM edges WHERE source_id IN (SELECT id FROM questions) OR target_id IN (SELECT id FROM questions)",
    );
  }
  db.exec("DROP TABLE IF EXISTS questions");
}

async function forwardQuestionsTableTauri(db: TauriConceptMigrator): Promise<void> {
  await db.execute(QUESTIONS_TABLE_SQL);
}

async function rollbackQuestionsTableTauri(db: TauriConceptMigrator): Promise<void> {
  const edgeTable = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'edges'",
  );
  const questionTable = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'questions'",
  );
  if (edgeTable.length > 0 && questionTable.length > 0) {
    await db.execute(
      "DELETE FROM edges WHERE source_id IN (SELECT id FROM questions) OR target_id IN (SELECT id FROM questions)",
    );
  }
  await db.execute("DROP TABLE IF EXISTS questions");
}

function forwardSkillsTableSqlite(db: Database.Database): void {
  db.exec(SKILLS_TABLE_SQL);
}

function rollbackSkillsTableSqlite(db: Database.Database): void {
  if (sqliteTableExists(db, "edges") && sqliteTableExists(db, "skills")) {
    db.exec(
      "DELETE FROM edges WHERE source_id IN (SELECT id FROM skills) OR target_id IN (SELECT id FROM skills)",
    );
  }
  db.exec("DROP TABLE IF EXISTS skills");
}

async function forwardSkillsTableTauri(db: TauriConceptMigrator): Promise<void> {
  await db.execute(SKILLS_TABLE_SQL);
}

async function rollbackSkillsTableTauri(db: TauriConceptMigrator): Promise<void> {
  const edgeTable = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'edges'",
  );
  const skillTable = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'skills'",
  );
  if (edgeTable.length > 0 && skillTable.length > 0) {
    await db.execute(
      "DELETE FROM edges WHERE source_id IN (SELECT id FROM skills) OR target_id IN (SELECT id FROM skills)",
    );
  }
  await db.execute("DROP TABLE IF EXISTS skills");
}

function sqliteTableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(name) as { name: string } | undefined;
  return row != null;
}

function forwardProjectsTableSqlite(db: Database.Database): void {
  db.exec(PROJECTS_TABLE_SQL);
  forwardDropEdgeForeignKeysSqlite(db);
}

function forwardDropEdgeForeignKeysSqlite(db: Database.Database): void {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'edges'")
    .get() as { sql: string } | undefined;
  if (!row?.sql.includes("FOREIGN KEY")) {
    return;
  }
  db.exec(`
    CREATE TABLE edges_kp08 (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO edges_kp08 (id, source_id, target_id, relation_type, archived)
    SELECT id, source_id, target_id, relation_type, archived FROM edges;
    DROP TABLE edges;
    ALTER TABLE edges_kp08 RENAME TO edges;
    CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
    CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
    CREATE INDEX IF NOT EXISTS idx_edges_archived ON edges(archived);
  `);
}

function rollbackProjectsTableSqlite(db: Database.Database): void {
  if (sqliteTableExists(db, "edges") && sqliteTableExists(db, "projects")) {
    db.exec(
      "DELETE FROM edges WHERE source_id IN (SELECT id FROM projects) OR target_id IN (SELECT id FROM projects)",
    );
  }
  db.exec("DROP TABLE IF EXISTS projects");
  if (sqliteTableExists(db, "edges")) {
    rollbackRestoreEdgeForeignKeysSqlite(db);
  }
}

function rollbackRestoreEdgeForeignKeysSqlite(db: Database.Database): void {
  if (!sqliteTableExists(db, "edges")) {
    return;
  }
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'edges'")
    .get() as { sql: string } | undefined;
  if (row?.sql.includes("FOREIGN KEY")) {
    return;
  }
  db.exec(`
    DELETE FROM edges
    WHERE source_id NOT IN (SELECT id FROM concepts)
       OR target_id NOT IN (SELECT id FROM concepts);
    CREATE TABLE edges_legacy (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (source_id) REFERENCES concepts(id),
      FOREIGN KEY (target_id) REFERENCES concepts(id)
    );
    INSERT INTO edges_legacy (id, source_id, target_id, relation_type, archived)
    SELECT id, source_id, target_id, relation_type, archived FROM edges;
    DROP TABLE edges;
    ALTER TABLE edges_legacy RENAME TO edges;
    CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
    CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
    CREATE INDEX IF NOT EXISTS idx_edges_archived ON edges(archived);
  `);
}

async function forwardProjectsTableTauri(db: TauriConceptMigrator): Promise<void> {
  await db.execute(PROJECTS_TABLE_SQL);
  await forwardDropEdgeForeignKeysTauri(db);
}

async function forwardDropEdgeForeignKeysTauri(db: TauriConceptMigrator): Promise<void> {
  const rows = await db.select<Array<{ sql: string }>>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'edges'",
  );
  const ddl = rows[0]?.sql ?? "";
  if (!ddl.includes("FOREIGN KEY")) {
    return;
  }
  await db.execute(`
    CREATE TABLE edges_kp08 (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    );
  `);
  await db.execute(`
    INSERT INTO edges_kp08 (id, source_id, target_id, relation_type, archived)
    SELECT id, source_id, target_id, relation_type, archived FROM edges
  `);
  await db.execute("DROP TABLE edges");
  await db.execute("ALTER TABLE edges_kp08 RENAME TO edges");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_edges_archived ON edges(archived)");
}

async function rollbackProjectsTableTauri(db: TauriConceptMigrator): Promise<void> {
  const edgeTable = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'edges'",
  );
  const projectTable = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'projects'",
  );
  if (edgeTable.length > 0 && projectTable.length > 0) {
    await db.execute(
      "DELETE FROM edges WHERE source_id IN (SELECT id FROM projects) OR target_id IN (SELECT id FROM projects)",
    );
  }
  await db.execute("DROP TABLE IF EXISTS projects");
  if (edgeTable.length > 0) {
    await rollbackRestoreEdgeForeignKeysTauri(db);
  }
}

async function rollbackRestoreEdgeForeignKeysTauri(db: TauriConceptMigrator): Promise<void> {
  const tables = await db.select<Array<{ name: string }>>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'edges'",
  );
  if (tables.length === 0) {
    return;
  }
  const rows = await db.select<Array<{ sql: string }>>(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'edges'",
  );
  if (rows[0]?.sql.includes("FOREIGN KEY")) {
    return;
  }
  await db.execute(`
    DELETE FROM edges
    WHERE source_id NOT IN (SELECT id FROM concepts)
       OR target_id NOT IN (SELECT id FROM concepts)
  `);
  await db.execute(`
    CREATE TABLE edges_legacy (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (source_id) REFERENCES concepts(id),
      FOREIGN KEY (target_id) REFERENCES concepts(id)
    )
  `);
  await db.execute(`
    INSERT INTO edges_legacy (id, source_id, target_id, relation_type, archived)
    SELECT id, source_id, target_id, relation_type, archived FROM edges
  `);
  await db.execute("DROP TABLE edges");
  await db.execute("ALTER TABLE edges_legacy RENAME TO edges");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id)");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_edges_archived ON edges(archived)");
}

export interface GraphSchemaMigrationStep {
  /** Target version after this step applies. */
  version: number;
  description: string;
  forwardSqlite: (db: Database.Database) => void;
  rollbackSqlite?: (db: Database.Database) => void;
  forwardTauri?: (db: TauriConceptMigrator) => Promise<void>;
  rollbackTauri?: (db: TauriConceptMigrator) => Promise<void>;
}

/**
 * Ordered graph schema migrations for KP-08+ node-type expansion.
 * Register forward/rollback steps here; KP-08 adds version 2 (Project).
 * KP-10+ adds Source/Decision/Question/Skill — not Project (see KP-08 spec).
 */
export const GRAPH_SCHEMA_MIGRATION_STEPS: GraphSchemaMigrationStep[] = [
  {
    version: GRAPH_SCHEMA_VERSION_WITH_PROJECT,
    description: "KP-08 minimal Project node table",
    forwardSqlite: forwardProjectsTableSqlite,
    rollbackSqlite: rollbackProjectsTableSqlite,
    forwardTauri: forwardProjectsTableTauri,
    rollbackTauri: rollbackProjectsTableTauri,
  },
  {
    version: GRAPH_SCHEMA_VERSION_WITH_SOURCE,
    description: "KP-10 Source node table",
    forwardSqlite: forwardSourcesTableSqlite,
    rollbackSqlite: rollbackSourcesTableSqlite,
    forwardTauri: forwardSourcesTableTauri,
    rollbackTauri: rollbackSourcesTableTauri,
  },
  {
    version: GRAPH_SCHEMA_VERSION_WITH_DECISION,
    description: "KP-11 Decision node table",
    forwardSqlite: forwardDecisionsTableSqlite,
    rollbackSqlite: rollbackDecisionsTableSqlite,
    forwardTauri: forwardDecisionsTableTauri,
    rollbackTauri: rollbackDecisionsTableTauri,
  },
  {
    version: GRAPH_SCHEMA_VERSION_WITH_QUESTION,
    description: "KP-12 Question node table",
    forwardSqlite: forwardQuestionsTableSqlite,
    rollbackSqlite: rollbackQuestionsTableSqlite,
    forwardTauri: forwardQuestionsTableTauri,
    rollbackTauri: rollbackQuestionsTableTauri,
  },
  {
    version: GRAPH_SCHEMA_VERSION_WITH_SKILL,
    description: "KP-13 Skill node table",
    forwardSqlite: forwardSkillsTableSqlite,
    rollbackSqlite: rollbackSkillsTableSqlite,
    forwardTauri: forwardSkillsTableTauri,
    rollbackTauri: rollbackSkillsTableTauri,
  },
];

export function readGraphSchemaVersionSqlite(db: Database.Database): number {
  const row = db
    .prepare("SELECT value FROM app_meta WHERE key = ?")
    .get(GRAPH_SCHEMA_VERSION_META_KEY) as { value: string } | undefined;
  if (!row) {
    return GRAPH_SCHEMA_VERSION_BASELINE;
  }
  const parsed = Number.parseInt(row.value, 10);
  return Number.isFinite(parsed) ? parsed : GRAPH_SCHEMA_VERSION_BASELINE;
}

export function writeGraphSchemaVersionSqlite(
  db: Database.Database,
  version: number,
): void {
  db.prepare(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(GRAPH_SCHEMA_VERSION_META_KEY, String(version));
}

export async function readGraphSchemaVersionTauri(
  db: TauriConceptMigrator,
): Promise<number> {
  const rows = await db.select<Array<{ value: string }>>(
    "SELECT value FROM app_meta WHERE key = $1",
    [GRAPH_SCHEMA_VERSION_META_KEY],
  );
  const row = rows[0];
  if (!row) {
    return GRAPH_SCHEMA_VERSION_BASELINE;
  }
  const parsed = Number.parseInt(row.value, 10);
  return Number.isFinite(parsed) ? parsed : GRAPH_SCHEMA_VERSION_BASELINE;
}

export async function writeGraphSchemaVersionTauri(
  db: TauriConceptMigrator,
  version: number,
): Promise<void> {
  await db.execute(
    `INSERT INTO app_meta (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [GRAPH_SCHEMA_VERSION_META_KEY, String(version)],
  );
}

/** Apply pending forward graph schema migrations (KP-08+). */
export function applyGraphSchemaMigrationsSqlite(db: Database.Database): number {
  let current = readGraphSchemaVersionSqlite(db);
  for (const step of GRAPH_SCHEMA_MIGRATION_STEPS) {
    if (step.version <= current) {
      continue;
    }
    step.forwardSqlite(db);
    current = step.version;
    writeGraphSchemaVersionSqlite(db, current);
  }
  return current;
}

export async function applyGraphSchemaMigrationsTauri(
  db: TauriConceptMigrator,
): Promise<number> {
  let current = await readGraphSchemaVersionTauri(db);
  for (const step of GRAPH_SCHEMA_MIGRATION_STEPS) {
    if (step.version <= current) {
      continue;
    }
    if (step.forwardTauri) {
      await step.forwardTauri(db);
    } else {
      throw new Error(
        `Graph schema migration v${step.version} missing forwardTauri implementation`,
      );
    }
    current = step.version;
    await writeGraphSchemaVersionTauri(db, current);
  }
  return current;
}

/** Roll back to `targetVersion` when rollback hooks exist (KP-08+ dev/recovery). */
export function rollbackGraphSchemaMigrationsSqlite(
  db: Database.Database,
  targetVersion: number,
): number {
  let current = readGraphSchemaVersionSqlite(db);
  const steps = [...GRAPH_SCHEMA_MIGRATION_STEPS]
    .filter((step) => step.version > targetVersion && step.version <= current)
    .sort((a, b) => b.version - a.version);
  for (const step of steps) {
    if (!step.rollbackSqlite) {
      throw new Error(
        `Graph schema migration v${step.version} has no rollbackSqlite hook`,
      );
    }
    step.rollbackSqlite(db);
    current = step.version - 1;
    writeGraphSchemaVersionSqlite(db, current);
  }
  return current;
}

/** Idempotent column adds for concepts.salience (M2). */
export function migrateConceptSalienceColumnsSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(concepts)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("salience")) {
    db.exec(
      "ALTER TABLE concepts ADD COLUMN salience REAL NOT NULL DEFAULT 1.0",
    );
  }
  if (!names.has("last_touched_at")) {
    db.exec("ALTER TABLE concepts ADD COLUMN last_touched_at TEXT");
  }
}

export async function migrateConceptSalienceColumnsTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(concepts)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("salience")) {
    await db.execute(
      "ALTER TABLE concepts ADD COLUMN salience REAL NOT NULL DEFAULT 1.0",
    );
  }
  if (!names.has("last_touched_at")) {
    await db.execute("ALTER TABLE concepts ADD COLUMN last_touched_at TEXT");
  }
}

const GRAPH_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS graph_history (
  id TEXT PRIMARY KEY NOT NULL,
  at TEXT NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  undone INTEGER NOT NULL DEFAULT 0
);
`;

export function migrateGraphHistoryTableSqlite(db: Database.Database): void {
  db.exec(GRAPH_HISTORY_TABLE_SQL);
}

export async function migrateGraphHistoryTableTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  await db.execute(GRAPH_HISTORY_TABLE_SQL);
}

/** Idempotent column adds for graph_history provenance (W2). */
export function migrateGraphHistoryProvenanceSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(graph_history)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("reason_code")) {
    db.exec(
      "ALTER TABLE graph_history ADD COLUMN reason_code TEXT NOT NULL DEFAULT 'manual'",
    );
  }
  if (!names.has("reason_detail")) {
    db.exec(
      "ALTER TABLE graph_history ADD COLUMN reason_detail TEXT NOT NULL DEFAULT ''",
    );
  }
  if (!names.has("affected_node_ids")) {
    db.exec(
      "ALTER TABLE graph_history ADD COLUMN affected_node_ids TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!names.has("affected_edge_ids")) {
    db.exec(
      "ALTER TABLE graph_history ADD COLUMN affected_edge_ids TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!names.has("edge_migrations")) {
    db.exec(
      "ALTER TABLE graph_history ADD COLUMN edge_migrations TEXT NOT NULL DEFAULT '[]'",
    );
  }
}

export async function migrateGraphHistoryProvenanceTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(graph_history)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("reason_code")) {
    await db.execute(
      "ALTER TABLE graph_history ADD COLUMN reason_code TEXT NOT NULL DEFAULT 'manual'",
    );
  }
  if (!names.has("reason_detail")) {
    await db.execute(
      "ALTER TABLE graph_history ADD COLUMN reason_detail TEXT NOT NULL DEFAULT ''",
    );
  }
  if (!names.has("affected_node_ids")) {
    await db.execute(
      "ALTER TABLE graph_history ADD COLUMN affected_node_ids TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!names.has("affected_edge_ids")) {
    await db.execute(
      "ALTER TABLE graph_history ADD COLUMN affected_edge_ids TEXT NOT NULL DEFAULT '[]'",
    );
  }
  if (!names.has("edge_migrations")) {
    await db.execute(
      "ALTER TABLE graph_history ADD COLUMN edge_migrations TEXT NOT NULL DEFAULT '[]'",
    );
  }
}

/** Idempotent column adds for concepts temporal provenance (W2). */
export function migrateConceptTemporalColumnsSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(concepts)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("archived_at")) {
    db.exec("ALTER TABLE concepts ADD COLUMN archived_at TEXT");
  }
  if (!names.has("supersedes_node_id")) {
    db.exec("ALTER TABLE concepts ADD COLUMN supersedes_node_id TEXT");
  }
}

export async function migrateConceptTemporalColumnsTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(concepts)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("archived_at")) {
    await db.execute("ALTER TABLE concepts ADD COLUMN archived_at TEXT");
  }
  if (!names.has("supersedes_node_id")) {
    await db.execute("ALTER TABLE concepts ADD COLUMN supersedes_node_id TEXT");
  }
}

const LEARNING_TRACES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS learning_traces (
  id TEXT PRIMARY KEY NOT NULL,
  concept_ref TEXT NOT NULL,
  kind TEXT NOT NULL,
  at TEXT NOT NULL,
  session_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_learning_traces_concept_ref ON learning_traces(concept_ref);
CREATE INDEX IF NOT EXISTS idx_learning_traces_session_id ON learning_traces(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_traces_at ON learning_traces(at);
`;

export function migrateLearningTracesTableSqlite(db: Database.Database): void {
  db.exec(LEARNING_TRACES_TABLE_SQL);
}

export async function migrateLearningTracesTableTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  await db.execute(LEARNING_TRACES_TABLE_SQL);
}

const BRIEFING_FEEDBACK_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS briefing_feedback (
  id TEXT PRIMARY KEY NOT NULL,
  world_item_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_briefing_feedback_world_item ON briefing_feedback(world_item_id);
CREATE INDEX IF NOT EXISTS idx_briefing_feedback_at ON briefing_feedback(at);
`;

export function migrateBriefingFeedbackTableSqlite(db: Database.Database): void {
  db.exec(BRIEFING_FEEDBACK_TABLE_SQL);
}

export async function migrateBriefingFeedbackTableTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  await db.execute(BRIEFING_FEEDBACK_TABLE_SQL);
}

const COGNITIVE_ACTIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS cognitive_actions (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  citations_json TEXT NOT NULL DEFAULT '[]',
  permission_level TEXT NOT NULL DEFAULT 'suggest',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_actions_status ON cognitive_actions(status);
CREATE INDEX IF NOT EXISTS idx_cognitive_actions_kind ON cognitive_actions(kind);
`;

export function migrateCognitiveActionsTableSqlite(db: Database.Database): void {
  db.exec(COGNITIVE_ACTIONS_TABLE_SQL);
}

export async function migrateCognitiveActionsTableTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  await db.execute(COGNITIVE_ACTIONS_TABLE_SQL);
}

/** Idempotent metadata_json column for cognitive_actions (KOS-E2). */
export function migrateCognitiveActionsMetadataColumnSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(cognitive_actions)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("metadata_json")) {
    db.exec(
      "ALTER TABLE cognitive_actions ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'",
    );
  }
}

export async function migrateCognitiveActionsMetadataColumnTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(cognitive_actions)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("metadata_json")) {
    await db.execute(
      "ALTER TABLE cognitive_actions ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}'",
    );
  }
}

/** Idempotent column add for concepts provenance (KOS-D1). */
export function migrateConceptSourceRefsColumnsSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(concepts)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("source_refs_json")) {
    db.exec(
      "ALTER TABLE concepts ADD COLUMN source_refs_json TEXT NOT NULL DEFAULT '[]'",
    );
  }
}

export async function migrateConceptSourceRefsColumnsTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(concepts)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("source_refs_json")) {
    await db.execute(
      "ALTER TABLE concepts ADD COLUMN source_refs_json TEXT NOT NULL DEFAULT '[]'",
    );
  }
}

/** Idempotent column add for edges.archived (KOS-A3 undo without SQL DELETE). */
export function migrateEdgeArchivedColumnSqlite(db: Database.Database): void {
  const columns = db
    .prepare("PRAGMA table_info(edges)")
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("archived")) {
    db.exec("ALTER TABLE edges ADD COLUMN archived INTEGER NOT NULL DEFAULT 0");
    db.exec("CREATE INDEX IF NOT EXISTS idx_edges_archived ON edges(archived)");
  }
}

export async function migrateEdgeArchivedColumnTauri(
  db: TauriConceptMigrator,
): Promise<void> {
  const columns = await db.select<Array<{ name: string }>>(
    "PRAGMA table_info(edges)",
  );
  const names = new Set(columns.map((row) => row.name));
  if (!names.has("archived")) {
    await db.execute(
      "ALTER TABLE edges ADD COLUMN archived INTEGER NOT NULL DEFAULT 0",
    );
    await db.execute(
      "CREATE INDEX IF NOT EXISTS idx_edges_archived ON edges(archived)",
    );
  }
}
