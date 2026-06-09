import type { GraphHistoryEntry } from "@/domain/graphHistory";
import type { LearningTrace } from "@/domain/learning/learningTrace";
import { formatPendingConceptRef } from "@/domain/learning/learningTrace";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/domain/profile";
import type { WeeklyBrainReviewSectionKind } from "@/domain/review/weeklyBrainReview";
import { weekRangeForIsoWeek } from "@/domain/review/weeklyBrainReview";
import {
  metaForDuplicateMerge,
  metaForIngestLink,
  metaForStaleArchive,
} from "@/agent/curation/curationReason";
import {
  SHOWCASE_AUTO_CURATE_GOLDEN,
  SHOWCASE_INGEST_CANDIDATE,
  SHOWCASE_INGEST_NODE_ID,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";

/** Frozen ISO week for D3 golden harness. */
export const WEEKLY_REVIEW_WEEK_ID = "2026-W22";

export const WEEKLY_REVIEW_W22_RANGE = weekRangeForIsoWeek(WEEKLY_REVIEW_WEEK_ID);

/** Timestamps inside W22 (SHOWCASE_NOW is W23 — fixtures use late May). */
const W22_AT = {
  ingest: "2026-05-26T08:00:00.000Z",
  link: "2026-05-26T09:00:00.000Z",
  merge: "2026-05-27T10:00:00.000Z",
  archive: "2026-05-28T11:00:00.000Z",
  trace1: "2026-05-29T12:00:00.000Z",
  trace2: "2026-05-30T13:00:00.000Z",
} as const;

const emptySnapshot = { nodes: [], edges: [] };

/** A3 link + D2 merge/archive + graphiti ingest — all in 2026-W22. */
export const WEEKLY_REVIEW_FIXTURE_HISTORY: GraphHistoryEntry[] = [
  {
    id: "weekly-fixture-create-graphiti",
    at: W22_AT.ingest,
    kind: "create",
    summary: `新建「${SHOWCASE_INGEST_CANDIDATE.title}」`,
    reasonCode: "manual",
    reasonDetail: "用户语音确认入库",
    affectedNodeIds: [SHOWCASE_INGEST_NODE_ID],
    affectedEdgeIds: [],
    edgeMigrations: [],
    before: emptySnapshot,
    after: emptySnapshot,
  },
  {
    id: "weekly-fixture-link-graphiti-agent",
    at: W22_AT.link,
    kind: "link",
    summary: SHOWCASE_AUTO_CURATE_GOLDEN.summary,
    ...metaForIngestLink(
      SHOWCASE_INGEST_NODE_ID,
      SHOWCASE_AUTO_CURATE_GOLDEN.targetId,
      SHOWCASE_INGEST_CANDIDATE.title,
      "AI Agent",
    ),
    affectedEdgeIds: [],
    edgeMigrations: [],
    before: emptySnapshot,
    after: emptySnapshot,
  },
  {
    id: "weekly-fixture-merge-rag-dup",
    at: W22_AT.merge,
    kind: "merge",
    summary: "已合并重复 RAG 概念",
    ...metaForDuplicateMerge("demo-rag-dup", "demo-rag", "RAG"),
    affectedEdgeIds: [],
    edgeMigrations: [
      {
        edgeId: "e-migrated-agent-rag",
        fromNodeId: "demo-rag-dup",
        toNodeId: "demo-rag",
      },
    ],
    before: emptySnapshot,
    after: emptySnapshot,
  },
  {
    id: "weekly-fixture-archive-stale",
    at: W22_AT.archive,
    kind: "archive",
    summary: "已归档旧版向量检索",
    ...metaForStaleArchive("demo-stale-concept", "旧版向量检索"),
    affectedEdgeIds: [],
    edgeMigrations: [],
    before: emptySnapshot,
    after: emptySnapshot,
  },
];

export const WEEKLY_REVIEW_FIXTURE_TRACES: LearningTrace[] = [
  {
    id: "weekly-trace-elaborate",
    conceptRef: formatPendingConceptRef("voice-agent-starter"),
    kind: "briefing_elaborate",
    at: W22_AT.trace1,
    sessionId: "weekly-fixture-session",
    metadata: { worldItemId: "showcase-brief-2", depth: 1 },
  },
  {
    id: "weekly-trace-ingest",
    conceptRef: SHOWCASE_INGEST_NODE_ID,
    kind: "briefing_ingest",
    at: W22_AT.trace2,
    sessionId: "weekly-fixture-session",
    metadata: {
      worldItemId: "showcase-brief-3",
      nodeId: SHOWCASE_INGEST_NODE_ID,
    },
  },
];

export const WEEKLY_REVIEW_FIXTURE_PROFILE: UserProfile = {
  ...DEFAULT_USER_PROFILE,
  understanding: {
    ...DEFAULT_USER_PROFILE.understanding,
    "demo-mcp": "unfamiliar",
  },
};

export interface WeeklyReviewGoldenCitation {
  type: "node" | "historyEntry" | "trace";
  id: string;
}

export interface WeeklyReviewGolden {
  weekId: string;
  sectionKinds: WeeklyBrainReviewSectionKind[];
  sectionTitles: string[];
  citations: WeeklyReviewGoldenCitation[];
  mergeArchiveHistoryEntryIds: string[];
  graphChangesBodyContains: string;
}

export const WEEKLY_REVIEW_GOLDEN: WeeklyReviewGolden = {
  weekId: WEEKLY_REVIEW_WEEK_ID,
  sectionKinds: [
    "graph_changes",
    "new_concepts",
    "merged_archived",
    "learning_activity",
    "weak_spots",
    "next_steps",
  ],
  sectionTitles: [
    "本周图谱结构变更",
    "新增概念",
    "合并与归档",
    "学习与追问",
    "薄弱点",
    "下一步建议",
  ],
  citations: [
    { type: "node", id: SHOWCASE_INGEST_NODE_ID },
    { type: "historyEntry", id: "weekly-fixture-create-graphiti" },
    { type: "historyEntry", id: "weekly-fixture-merge-rag-dup" },
    { type: "historyEntry", id: "weekly-fixture-archive-stale" },
    { type: "trace", id: "weekly-trace-ingest" },
  ],
  mergeArchiveHistoryEntryIds: [
    "weekly-fixture-merge-rag-dup",
    "weekly-fixture-archive-stale",
  ],
  graphChangesBodyContains: "结构变更",
};

/** Names that must not appear when history is empty (anti-hallucination guard). */
export const WEEKLY_REVIEW_FORBIDDEN_EMPTY_HISTORY_NAMES = [
  "demo-rag-dup",
  "旧版向量检索",
  "Graphiti",
  SHOWCASE_INGEST_CANDIDATE.title,
] as const;

/** Reference timestamp outside golden week for negative tests. */
export const WEEKLY_REVIEW_OUTSIDE_W22_AT = SHOWCASE_NOW;
