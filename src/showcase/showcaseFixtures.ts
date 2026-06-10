import type { AutoCurateProposal } from "@/agent/curation/autoCurate";
import { buildCreateProposalFromNews } from "@/conversation/ingestActions";
import type { IngestCommand } from "@/conversation/types";
import type { BrainGraphSnapshot, ConceptNode, GraphMutationProposal } from "@/domain/graph";
import { createProjectNode, type ProjectNode } from "@/domain/nodes/projectNode";
import type { SourceRef } from "@/domain/graph/sourceRef";
import { sourceRefFromLegacySourceUrl } from "@/domain/graph/sourceRef";
import type { NewsItem } from "@/domain/news";
import type { WorldItem } from "@/domain/radar/worldItem";
import { DEFAULT_USER_PROFILE, type UserProfile } from "@/domain/profile";
import { visibleGraph } from "@/lib/graphMutations";
import { mapNewsItemToWorldItem } from "@/radar/worldSources/worldSourceAdapter";

/** Frozen clock for deterministic showcase snapshots. */
export const SHOWCASE_NOW = "2026-06-01T00:00:00.000Z";

/** KP-08 showcase Project nodes (real ids referenced by KOS-E2). */
export const SHOWCASE_PROJECT_VOICE_ID = "proj-voice-companion";
export const SHOWCASE_PROJECT_MCP_ID = "proj-brain-mcp";

export const SHOWCASE_PERSONA_ID = "mentor" as const;

export const SHOWCASE_PROFILE: UserProfile = {
  ...DEFAULT_USER_PROFILE,
  persona: SHOWCASE_PERSONA_ID,
};

function showcaseLegacyNode(
  node: Omit<ConceptNode, "sourceRefs"> & { sourceRefs?: SourceRef[] },
): ConceptNode {
  const base: ConceptNode = {
    ...node,
    sourceRefs: node.sourceRefs ?? [],
    createdAt: node.createdAt ?? SHOWCASE_NOW,
    updatedAt: node.updatedAt ?? SHOWCASE_NOW,
  };
  if ((base.sourceRefs?.length ?? 0) === 0) {
    const legacy = sourceRefFromLegacySourceUrl(base);
    if (legacy) {
      base.sourceRefs = [legacy];
    }
  }
  return base;
}

function showcaseProjectNode(
  input: Pick<ProjectNode, "id" | "title" | "intro" | "archived"> &
    Partial<Pick<ProjectNode, "sourceRefs" | "createdAt" | "updatedAt">>,
) {
  return createProjectNode({
    ...input,
    sourceRefs: input.sourceRefs ?? [],
    createdAt: input.createdAt ?? SHOWCASE_NOW,
    updatedAt: input.updatedAt ?? SHOWCASE_NOW,
  });
}

/** §3.1 — fixed demo graph (7 concepts + 2 projects + edges, one archived concept). */
export const SHOWCASE_GRAPH_SNAPSHOT: BrainGraphSnapshot = {
  nodes: [
    showcaseLegacyNode({
      id: "demo-transformer",
      title: "Transformer",
      intro: "自注意力序列建模架构",
      sourceUrl: "https://arxiv.org/abs/1706.03762",
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    }),
    showcaseLegacyNode({
      id: "demo-attention",
      title: "Self-Attention",
      intro: "Query/Key/Value 注意力机制",
      sourceUrl: null,
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    }),
    showcaseLegacyNode({
      id: "demo-rag",
      title: "RAG",
      intro: "检索增强生成",
      sourceUrl: null,
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    }),
    showcaseLegacyNode({
      id: "demo-agent",
      title: "AI Agent",
      intro: "工具调用与任务编排",
      sourceUrl: null,
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    }),
    showcaseLegacyNode({
      id: "demo-llm",
      title: "LLM",
      intro: "大语言模型",
      sourceUrl: null,
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    }),
    showcaseLegacyNode({
      id: "demo-mcp",
      title: "MCP",
      intro: "Model Context Protocol",
      sourceUrl: null,
      archived: false,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    }),
    showcaseLegacyNode({
      id: "demo-bert",
      title: "BERT",
      intro: "双向编码器（已归档示例）",
      sourceUrl: null,
      archived: true,
      createdAt: SHOWCASE_NOW,
      updatedAt: SHOWCASE_NOW,
    }),
    showcaseProjectNode({
      id: SHOWCASE_PROJECT_VOICE_ID,
      title: "沉浸式语音伴侣",
      intro: "my_brain v2 主形态：全屏星图 + 可打断 Realtime 语音",
      archived: false,
    }),
    showcaseProjectNode({
      id: SHOWCASE_PROJECT_MCP_ID,
      title: "Brain MCP 只读",
      intro: "brain_search_nodes / brain_outline 只读工具面",
      archived: false,
    }),
  ],
  edges: [
    {
      id: "e1",
      sourceId: "demo-attention",
      targetId: "demo-transformer",
      relationType: "is_a",
    },
    {
      id: "e2",
      sourceId: "demo-rag",
      targetId: "demo-llm",
      relationType: "depends_on",
    },
    {
      id: "e3",
      sourceId: "demo-agent",
      targetId: "demo-llm",
      relationType: "depends_on",
    },
    {
      id: "e4",
      sourceId: "demo-agent",
      targetId: "demo-mcp",
      relationType: "related",
    },
    {
      id: "e5",
      sourceId: "demo-bert",
      targetId: "demo-transformer",
      relationType: "replaces",
    },
    {
      id: "e-used-voice",
      sourceId: "demo-agent",
      targetId: SHOWCASE_PROJECT_VOICE_ID,
      relationType: "used_in",
    },
    {
      id: "e-used-mcp",
      sourceId: "demo-mcp",
      targetId: SHOWCASE_PROJECT_MCP_ID,
      relationType: "used_in",
    },
  ],
};

export function createShowcaseGraphSnapshot(): BrainGraphSnapshot {
  return structuredClone(SHOWCASE_GRAPH_SNAPSHOT);
}

/** §3.2 — three briefing items in fixed order for showcase newsQueue. */
export const SHOWCASE_BRIEFING_ITEMS: NewsItem[] = [
  {
    id: "showcase-brief-1",
    category: "ai_news",
    title: "OpenAI Realtime API 更新",
    summary: "原生 speech-to-speech，支持 barge-in 打断。",
    sourceName: "Mock RSS",
    sourceUrl: "https://example.com/realtime",
    publishedAt: SHOWCASE_NOW,
  },
  {
    id: "showcase-brief-2",
    category: "github_trending",
    title: "voice-agent-starter",
    summary: "GitHub 热榜：可插拔 VoiceProvider 的 Agent 脚手架。",
    sourceName: "GitHub Trending",
    sourceUrl: "https://github.com/example/voice-agent-starter",
    publishedAt: SHOWCASE_NOW,
  },
  {
    id: "showcase-brief-3",
    category: "ai_news",
    title: "Graphiti 时序知识图谱",
    summary: "把对话与文档整理为可演化图谱；适合个人认知 OS。",
    sourceName: "Mock RSS",
    sourceUrl: "https://example.com/graphiti",
    publishedAt: SHOWCASE_NOW,
  },
];

export const SHOWCASE_WORLD_ITEMS: WorldItem[] = SHOWCASE_BRIEFING_ITEMS.map((item, index) =>
  mapNewsItemToWorldItem(item, {
    id: `radar-wi-showcase-${index + 1}`,
    fetchedAt: item.publishedAt ?? SHOWCASE_NOW,
  }),
);

/** Only this brief is the designated voice-ingest candidate in showcase harness. */
export const SHOWCASE_DESIGNATED_INGEST_BRIEF_ID = "showcase-brief-3";

export const SHOWCASE_INGEST_NODE_ID = "showcase-ingest-graphiti";

/** §3.3 — concept candidate derived from showcase-brief-3 (not a news fragment). */
export const SHOWCASE_INGEST_CANDIDATE = {
  title: "Graphiti",
  intro: "时序知识图谱：把对话与文档整理为可演化的个人认知资产。",
  sourceUrl: "https://example.com/graphiti",
  nodeId: SHOWCASE_INGEST_NODE_ID,
  briefId: SHOWCASE_DESIGNATED_INGEST_BRIEF_ID,
} as const;

/** KOS-D1 — post-ingest graphiti node provenance golden. */
export const PROVENANCE_GRAPH_GOLDEN = {
  id: SHOWCASE_INGEST_NODE_ID,
  sourceRefs: [
    {
      url: "https://example.com/graphiti",
      title: "Graphiti 时序知识图谱",
      kind: "briefing" as const,
      worldItemId: "radar-wi-showcase-3",
      ingestedAt: SHOWCASE_NOW,
    },
  ],
  updatedAt: SHOWCASE_NOW,
} as const;

/** §3.4 — single deterministic auto-curate link after showcase ingest. */
export const SHOWCASE_AUTO_CURATE_GOLDEN = {
  kind: "link" as const,
  sourceId: SHOWCASE_INGEST_NODE_ID,
  targetId: "demo-agent",
  relationType: "related" as const,
  reasonCode: "ingest_link" as const,
  reasonDetail: "新概念 Graphiti 与已有 AI Agent 编排能力相关，自动连边。",
  summary: "已把 Graphiti 连到 AI Agent",
};

export type ShowcaseVoiceScriptKind =
  | "skip_launch"
  | "ingest_parse"
  | "undo_harness"
  | "ambiguity_regression";

export interface ShowcaseVoiceScriptStep {
  step: number | string;
  kind: ShowcaseVoiceScriptKind;
  transcript: string;
  /** For ingest_parse / ambiguity_regression steps. */
  attempt?: 1 | 2;
  expectedCommand?: IngestCommand;
  expectedParse?: "reprompt" | "skip" | "ingest" | "elaborate";
}

/** §3.5 — mock voice harness script (injectTranscript / simulateUserSpeech). */
export const SHOWCASE_VOICE_SCRIPT: ShowcaseVoiceScriptStep[] = [
  {
    step: 0,
    kind: "skip_launch",
    transcript: "跳过",
  },
  {
    step: 1,
    kind: "ingest_parse",
    transcript: "不要",
    attempt: 1,
    expectedCommand: "skip",
    expectedParse: "skip",
  },
  {
    step: 2,
    kind: "ingest_parse",
    transcript: "讲细点",
    attempt: 1,
    expectedCommand: "elaborate",
    expectedParse: "elaborate",
  },
  {
    step: "2b",
    kind: "ingest_parse",
    transcript: "不要",
    attempt: 1,
    expectedCommand: "skip",
    expectedParse: "skip",
  },
  {
    step: 3,
    kind: "ingest_parse",
    transcript: "入",
    attempt: 1,
    expectedCommand: "ingest",
    expectedParse: "ingest",
  },
  {
    step: 4,
    kind: "undo_harness",
    transcript: "撤销",
  },
];

/** Ambiguity regressions from §3.5 (not part of the main 3-brief loop). */
export const SHOWCASE_VOICE_AMBIGUITY_SCRIPT: ShowcaseVoiceScriptStep[] = [
  {
    step: "ambiguity-1",
    kind: "ambiguity_regression",
    transcript: "入库吧",
    attempt: 1,
    expectedParse: "reprompt",
  },
  {
    step: "ambiguity-2",
    kind: "ambiguity_regression",
    transcript: "算了算了",
    attempt: 1,
    expectedCommand: "skip",
    expectedParse: "skip",
  },
];

export function showcaseBriefById(id: string): NewsItem | undefined {
  return SHOWCASE_BRIEFING_ITEMS.find((item) => item.id === id);
}

export function buildShowcaseIngestCreateProposal(
  explanation: string = SHOWCASE_INGEST_CANDIDATE.intro,
): GraphMutationProposal {
  const brief = showcaseBriefById(SHOWCASE_DESIGNATED_INGEST_BRIEF_ID);
  if (!brief) {
    throw new Error("showcaseFixtures: designated ingest brief missing");
  }
  return buildCreateProposalFromNews(
    brief,
    explanation,
    {
      id: "showcase-create-graphiti",
      kind: "create",
      summary: `新建「${SHOWCASE_INGEST_CANDIDATE.title}」`,
      payload: {
        id: SHOWCASE_INGEST_NODE_ID,
        title: SHOWCASE_INGEST_CANDIDATE.title,
        intro: SHOWCASE_INGEST_CANDIDATE.intro,
        sourceUrl: SHOWCASE_INGEST_CANDIDATE.sourceUrl,
      },
    },
  );
}

export function showcaseIngestNodeFromGraph(): ConceptNode {
  return {
    id: SHOWCASE_INGEST_NODE_ID,
    title: SHOWCASE_INGEST_CANDIDATE.title,
    intro: SHOWCASE_INGEST_CANDIDATE.intro,
    sourceUrl: SHOWCASE_INGEST_CANDIDATE.sourceUrl,
    sourceRefs: [...PROVENANCE_GRAPH_GOLDEN.sourceRefs],
    archived: false,
    createdAt: SHOWCASE_NOW,
    updatedAt: SHOWCASE_NOW,
  };
}

function toAutoCurateProposal(
  golden: typeof SHOWCASE_AUTO_CURATE_GOLDEN,
): AutoCurateProposal {
  return {
    id: `auto-link-${golden.sourceId}-${golden.targetId}`,
    kind: golden.kind,
    summary: golden.summary,
    payload: {
      sourceId: golden.sourceId,
      targetId: golden.targetId,
      relationType: golden.relationType,
    },
    reasonCode: golden.reasonCode,
    reasonDetail: golden.reasonDetail,
    affectedNodeIds: [golden.sourceId, golden.targetId],
  };
}

/**
 * Showcase-only auto-curate: single ingest_link, no merge/archive.
 * Used when showcase demo mode is active (KOS-A1 golden path).
 */
export function autoCurateForShowcase(
  graph: BrainGraphSnapshot,
  newNode: ConceptNode,
): AutoCurateProposal[] {
  if (newNode.id !== SHOWCASE_INGEST_NODE_ID) {
    return [];
  }
  const agent = graph.nodes.find(
    (node) => node.id === SHOWCASE_AUTO_CURATE_GOLDEN.targetId && !node.archived,
  );
  if (!agent) {
    return [];
  }
  return [toAutoCurateProposal(SHOWCASE_AUTO_CURATE_GOLDEN)];
}

export function countShowcaseVisibleNodes(
  graph: BrainGraphSnapshot = SHOWCASE_GRAPH_SNAPSHOT,
): number {
  return visibleGraph(graph).nodes.length;
}
