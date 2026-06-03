import { toResearchTempId } from "@/agent/jobs/topicResearchJob";
import type { AgentTraceStep, ProposalEnvelope } from "@/agent/types";
import type { ResearchRunRecord } from "@/stores/researchRunStore";
import type { SelfCheckItem } from "@/stores/appStore";

export const VISUAL_INSIGHT_RUN_ID = "visual-research-run";

/** Research trace + batch proposals for insight visual smoke (`?visual=insight`). */
export const VISUAL_INSIGHT_TRACE: AgentTraceStep[] = [
  {
    stepId: "visual-plan",
    name: "plan",
    startedAt: "2026-06-02T08:00:00.000Z",
    finishedAt: "2026-06-02T08:00:01.200Z",
    tokensUsed: 140,
    inputSummary: "RAG 与 Agent 编排",
    outputSummary: "3 个子问题",
  },
  {
    stepId: "visual-synth",
    name: "synthesize",
    startedAt: "2026-06-02T08:00:01.200Z",
    finishedAt: "2026-06-02T08:00:02.800Z",
    tokensUsed: 360,
    outputSummary: "2 个概念候选",
  },
];

export const VISUAL_INSIGHT_RUN: ResearchRunRecord = {
  runId: VISUAL_INSIGHT_RUN_ID,
  topic: "RAG 与 Agent",
  trace: VISUAL_INSIGHT_TRACE,
  digest: {
    title: "RAG 与 Agent 编排要点",
    sections: [
      {
        headline: "检索增强",
        body: "RAG 为模型外接知识检索，降低幻觉。",
      },
    ],
    generatedAt: "2026-06-02T08:00:03.000Z",
  },
  finishedAt: "2026-06-02T08:00:03.000Z",
};

const visualInsightTempId = toResearchTempId("视觉调研概念");

export const VISUAL_INSIGHT_ENVELOPES: ProposalEnvelope[] = [
  {
    id: "visual-insight-env-1",
    runId: VISUAL_INSIGHT_RUN_ID,
    createdAt: "2026-06-02T08:00:03.000Z",
    source: "research_loop",
    status: "pending",
    proposal: {
      id: "visual-insight-prop-create",
      kind: "create",
      summary: "新建「视觉调研概念」",
      payload: {
        title: "视觉调研概念",
        intro: "洞察分区冒烟用待确认节点",
        sourceUrl: null,
      },
    },
  },
  {
    id: "visual-insight-env-2",
    runId: VISUAL_INSIGHT_RUN_ID,
    createdAt: "2026-06-02T08:00:03.000Z",
    source: "research_loop",
    status: "pending",
    proposal: {
      id: "visual-insight-prop-link",
      kind: "link",
      summary: "关联 demo-rag",
      payload: {
        sourceId: visualInsightTempId,
        targetId: "demo-rag",
        relationType: "related",
      },
    },
  },
];

/** Design-aligned diagnostics for pixel-regression (`?visual=boot`). */
export const VISUAL_BOOT_CHECKS: SelfCheckItem[] = [
  {
    id: "core",
    label: "Core Neural Engine",
    detail: "Initializing neural pathways",
    status: "ok",
  },
  {
    id: "memory",
    label: "Memory Allocation",
    detail: "Allocating dynamic memory",
    status: "ok",
  },
  {
    id: "graph",
    label: "Knowledge Graph",
    detail: "Loading knowledge structures",
    status: "ok",
  },
  {
    id: "vector",
    label: "Vector Database",
    detail: "Indexing vector embeddings",
    status: "ok",
  },
  {
    id: "voice",
    label: "Voice Engine",
    detail: "Calibrating voice synthesis",
    status: "ok",
  },
  {
    id: "nlp",
    label: "NLP Processing",
    detail: "Initializing language models",
    status: "ok",
  },
  {
    id: "news",
    label: "News Feed Syncing",
    detail: "Fetching latest global updates",
    status: "syncing",
  },
];

export const VISUAL_BOOT_LOGS = [
  "[BOOT] INITIALIZING SECOND BRAIN…",
  "> Core Neural Engine",
  "  Initializing neural pathways",
  "✓ Core Neural Engine",
  "> News Feed Syncing",
  "  Fetching latest global updates",
] as const;

export const VISUAL_BOOT_PROGRESS = 78;

/** Pending proposal for inbox visual smoke (`?visual=inbox`). */
export const VISUAL_INBOX_ENVELOPE: ProposalEnvelope = {
  id: "visual-env-1",
  runId: "visual-run",
  createdAt: "2026-06-02T08:00:00.000Z",
  source: "background_ingest",
  status: "pending",
  proposal: {
    id: "visual-prop-create-1",
    kind: "create",
    summary: "新建概念「视觉回归样例」",
    payload: {
      title: "视觉回归样例",
      intro: "收件箱冒烟用待确认节点",
      sourceUrl: null,
    },
  },
};

/** Pinned force-graph coordinates for stable main UI captures (`?visual=main`). */
export const VISUAL_GRAPH_PINNED_POSITIONS: Record<
  string,
  { x: number; y: number }
> = {
  "demo-transformer": { x: 40, y: -20 },
  "demo-attention": { x: -120, y: 60 },
  "demo-rag": { x: 160, y: 80 },
  "demo-agent": { x: -40, y: 140 },
  "demo-llm": { x: 120, y: -100 },
  "demo-mcp": { x: -160, y: -80 },
  "demo-bert": { x: 200, y: -40 },
};

/** Dev-only sample conversation for the `?graphDemo` first screen. Display only. */
export const DEMO_VOICE_TRANSCRIPTS = [
  {
    id: "demo-user-1",
    role: "user" as const,
    text: "帮我理一下 RAG 和 AI Agent 的关系？",
    final: true,
  },
  {
    id: "demo-assistant-1",
    role: "assistant" as const,
    text: "RAG 给模型外接知识检索；AI Agent 更进一步，让模型调用工具、规划多步任务。两者底层都依赖 LLM。",
    final: true,
  },
  {
    id: "demo-user-2",
    role: "user" as const,
    text: "那 MCP 是做什么的？",
    final: true,
  },
  {
    id: "demo-assistant-2",
    role: "assistant" as const,
    text: "MCP 是让 Agent 统一接入外部工具与数据源的协议，配合 Tool Use 把能力做成可插拔的。要把它入库到你的大脑吗？",
    final: false,
  },
];

export const VISUAL_VOICE_TRANSCRIPTS = [
  {
    id: "visual-user-1",
    role: "user" as const,
    text: "能简述一下深度学习的原理吗？",
    final: true,
  },
  {
    id: "visual-assistant-1",
    role: "assistant" as const,
    text: "深度学习是机器学习的一个分支，它使用多层神经网络模拟人脑处理信息的方式…",
    final: true,
  },
  {
    id: "visual-user-2",
    role: "user" as const,
    text: "它和机器学习有什么区别？",
    final: true,
  },
  {
    id: "visual-assistant-2",
    role: "assistant" as const,
    text: "机器学习是更广泛的概念，而深度学习是其中的一个子集…",
    final: true,
  },
];
