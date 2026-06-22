import type { AdaptiveSignal } from "../src/domain/adaptiveSignal.js";
import type { UserModeProfile } from "../src/domain/userMode.js";
import type { GraphChangeRecord, GraphSnapshot } from "../src/graph/types.js";
import type { ProfileCorrectionState } from "../src/profile/correctionHistory.js";
import { createEmptyCorrectionState } from "../src/profile/correctionHistory.js";
import type { ProvisionalCandidate } from "../src/provisional/types.js";
import type {
  LearningTraceRecord,
  MobilePersistedBundle,
  MobileStorage,
  ProviderConfigSnapshot,
  WorldItemRecord,
} from "../src/storage/mobileStorage.js";

import {
  ACTION_AUDIT_META_KEY,
  DEMO_FIXTURE_SOURCE,
  DEMO_MODE_META_KEY,
  DEMO_SEED_VERSION,
} from "./constants.js";
import demoGraphFixtureJson from "./demo_graph_v1.json";

export interface DemoGraphFixtureFile {
  version: string;
  nodes: GraphSnapshot["nodes"];
  edges: GraphSnapshot["edges"];
}

export const DEMO_GRAPH_FIXTURE = demoGraphFixtureJson as DemoGraphFixtureFile;

/** Fixed demo profile — deterministic across resets. */
export const DEMO_COLD_PROFILE: UserModeProfile = {
  primaryMode: "tech_tracker",
  secondaryModes: ["learner"],
  confidence: 0.72,
  recentIntent: "追踪 AI 语音与本地知识图谱",
};

const DEMO_HISTORY: GraphChangeRecord[] = [
  {
    id: "demo-history-1",
    kind: "node_created",
    summary: "演示：点亮 OpenAI Realtime API",
    before: { nodes: [], edges: [] },
    after: {
      nodes: [DEMO_GRAPH_FIXTURE.nodes[0]!],
      edges: [],
    },
    createdAt: "2026-06-01T10:05:00.000Z",
    undone: false,
  },
  {
    id: "demo-history-2",
    kind: "edge_created",
    summary: "演示：关联向量检索",
    before: {
      nodes: DEMO_GRAPH_FIXTURE.nodes.slice(0, 2),
      edges: [],
    },
    after: {
      nodes: DEMO_GRAPH_FIXTURE.nodes.slice(0, 2),
      edges: [DEMO_GRAPH_FIXTURE.edges[0]!],
    },
    createdAt: "2026-06-01T10:15:00.000Z",
    undone: false,
  },
];

const DEMO_SIGNALS: AdaptiveSignal[] = [
  {
    sourceType: "radar",
    userModeFit: "tech_tracker",
    freshness: 0.91,
    evidenceRefs: ["demo-node-realtime-api", "graph_change:demo-history-1"],
    confidence: 0.88,
    privacyLevel: "local_only",
    suggestedIntent: "explain_more",
  },
];

const DEMO_LEARNING_TRACES: LearningTraceRecord[] = [
  {
    id: "demo-trace-1",
    topic: "Realtime API barge-in",
    note: "演示回放：用户打断后助手立即转听",
    createdAt: "2026-06-01T11:00:00.000Z",
  },
];

const DEMO_WORLD_ITEMS: WorldItemRecord[] = [
  {
    id: "demo-world-1",
    title: "GitHub Trending — agents",
    freshness: 0.8,
    updatedAt: "2026-06-01T09:00:00.000Z",
  },
];

/** Showcase step 4 uses a pre-seeded provisional row (Share stub documented in script). */
export const DEMO_SHOWCASE_PROVISIONAL: ProvisionalCandidate = {
  id: "demo-provisional-link",
  sourceType: "link",
  summary: "一篇关于本地优先知识 OS 的分享链接",
  evidenceRefs: ["demo://capture/share-link"],
  createdAt: "2026-06-01T12:30:00.000Z",
  status: "pending",
  linkUrl: "https://example.com/demo/local-first-knowledge",
  fetchOk: true,
};

export const DEFAULT_DEMO_PROVIDER_CONFIG: ProviderConfigSnapshot = {
  llm: "mock",
  radar: "fixture",
  voice: "mock",
  storage: "ready",
};

export function assertDemoFixtureGraph(graph: GraphSnapshot): void {
  if (graph.nodes.length !== DEMO_GRAPH_FIXTURE.nodes.length) {
    throw new Error(
      `demo graph node count mismatch: expected ${DEMO_GRAPH_FIXTURE.nodes.length}, got ${graph.nodes.length}`,
    );
  }
  for (const node of graph.nodes) {
    if (node.ingestSource !== DEMO_FIXTURE_SOURCE) {
      throw new Error(`demo node ${node.id} missing ingestSource demo_fixture`);
    }
  }
}

export function buildDemoSeedBundle(input?: {
  providerConfig?: ProviderConfigSnapshot;
  includeShowcaseProvisional?: boolean;
}): MobilePersistedBundle {
  const graph: GraphSnapshot = {
    nodes: DEMO_GRAPH_FIXTURE.nodes.map((node) => ({ ...node })),
    edges: DEMO_GRAPH_FIXTURE.edges.map((edge) => ({ ...edge })),
  };
  assertDemoFixtureGraph(graph);

  const correctionState: ProfileCorrectionState = createEmptyCorrectionState();

  return {
    profile: { ...DEMO_COLD_PROFILE },
    coldStartComplete: true,
    correctionState,
    graph,
    history: DEMO_HISTORY.map((entry) => ({
      ...entry,
      before: {
        nodes: entry.before.nodes.map((n) => ({ ...n })),
        edges: entry.before.edges.map((e) => ({ ...e })),
      },
      after: {
        nodes: entry.after.nodes.map((n) => ({ ...n })),
        edges: entry.after.edges.map((e) => ({ ...e })),
      },
    })),
    provisional: input?.includeShowcaseProvisional ? [{ ...DEMO_SHOWCASE_PROVISIONAL }] : [],
    pendingIngest: null,
    signals: DEMO_SIGNALS.map((signal) => ({ ...signal })),
    learningTraces: DEMO_LEARNING_TRACES.map((trace) => ({ ...trace })),
    worldItems: DEMO_WORLD_ITEMS.map((item) => ({ ...item })),
    providerConfig: input?.providerConfig ?? { ...DEFAULT_DEMO_PROVIDER_CONFIG },
  };
}

export function demoFixtureFingerprint(): string {
  const payload = JSON.stringify({
    version: DEMO_SEED_VERSION,
    nodes: DEMO_GRAPH_FIXTURE.nodes.map((n) => n.id),
    edges: DEMO_GRAPH_FIXTURE.edges.map((e) => e.id),
  });
  let hash = 0;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash * 31 + payload.charCodeAt(i)) >>> 0;
  }
  return `demo-v1-${hash.toString(16)}`;
}

export interface ResetDemoCoreOptions {
  /** Keep provider snapshot from current DB when true (default true). */
  preserveProviderConfig?: boolean;
  /** Seed one inbox candidate for showcase step 4 (default false — spec: empty provisional). */
  includeShowcaseProvisional?: boolean;
}

export interface ResetDemoCoreResult {
  demoMode: true;
  seedVersion: string;
  graphNodeCount: number;
  provisionalCount: number;
  fingerprint: string;
}

export function isDemoModeActive(storage: MobileStorage): boolean {
  return storage.getMeta(DEMO_MODE_META_KEY) === "true";
}

/** Wipes user graph/profile/provisional and restores labeled demo seed — does not export prior data. */
export function resetDemoStorage(
  storage: MobileStorage,
  options: ResetDemoCoreOptions = {},
): ResetDemoCoreResult {
  const preserveProvider = options.preserveProviderConfig !== false;
  const includeProvisional = options.includeShowcaseProvisional === true;

  storage.migrate();

  const preservedProvider = preserveProvider
    ? storage.loadProviderConfig()
    : DEFAULT_DEMO_PROVIDER_CONFIG;

  const bundle = buildDemoSeedBundle({
    providerConfig: preservedProvider,
    includeShowcaseProvisional: includeProvisional,
  });

  storage.restoreBackupBundle({
    ...bundle,
    radarCursor: null,
  });

  storage.clearDiagnosticEvents();
  storage.deleteMeta(ACTION_AUDIT_META_KEY);

  storage.setMeta(DEMO_MODE_META_KEY, "true");
  storage.setMeta("demo_seed_version", DEMO_SEED_VERSION);
  storage.setMeta("demo_fixture_fingerprint", demoFixtureFingerprint());

  const hydrated = storage.hydrateBundle();
  assertDemoFixtureGraph(hydrated.graph);

  return {
    demoMode: true,
    seedVersion: DEMO_SEED_VERSION,
    graphNodeCount: hydrated.graph.nodes.filter((n) => !n.archived).length,
    provisionalCount: hydrated.provisional.length,
    fingerprint: demoFixtureFingerprint(),
  };
}
