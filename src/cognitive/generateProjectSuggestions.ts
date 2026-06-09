import { createCognitiveAction } from "@/actions/createCognitiveAction";
import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import type { CognitiveAction, CognitiveActionCitation } from "@/domain/actions/cognitiveAction";
import type { ProjectSuggestionMetadata } from "@/domain/actions/cognitiveAction";
import {
  buildProjectSuggestionBodyMarkdown,
  containsBannedSuggestionPhrase,
  parseMetadataFromAction,
} from "@/domain/actions/projectSuggestionMetadata";
import type { WorldItem } from "@/domain/radar/worldItem";
import type { WeeklyBrainReview } from "@/domain/review/weeklyBrainReview";
import {
  PROJECT_SUGGESTIONS_GOLDEN,
  PROJECT_SUGGESTION_TREND_FIXTURE_ID,
} from "@/cognitive/projectSuggestionsGolden";
import { RADAR_FIXTURE_WORLD_ITEMS } from "@/radar/worldSources/fixtureWorldSource";
import {
  SHOWCASE_INGEST_NODE_ID,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";
export interface GenerateProjectSuggestionsInput {
  graph: BrainGraphSnapshot;
  trendItems?: WorldItem[];
  weeklyReview?: WeeklyBrainReview;
  createdAt?: string;
}

export interface GenerateProjectSuggestionsResult {
  actions: CognitiveAction[];
  /** Present when graph has no active nodes. */
  emptyReason?: string;
}

interface SuggestionTemplate {
  id: string;
  kind: "project_issue" | "roadmap";
  title: string;
  linkedNodeIds: string[];
  optionalGraphitiNodeId?: string;
  buildCopy: (ctx: TemplateContext) => {
    reason: string;
    expectedImpact: string;
    suggestedNextStep: string;
    intro: string;
    worldItemId?: string;
  };
}

interface TemplateContext {
  nodeMap: Map<string, ConceptNode>;
  trendById: Map<string, WorldItem>;
  weeklyReview?: WeeklyBrainReview;
}

const SUGGESTION_TEMPLATES: SuggestionTemplate[] = [
  {
    id: "pa-1",
    kind: "project_issue",
    title: "Issue 草稿 · Graphiti 语音演示与 Realtime 打断",
    linkedNodeIds: ["demo-agent", SHOWCASE_INGEST_NODE_ID],
    optionalGraphitiNodeId: SHOWCASE_INGEST_NODE_ID,
    buildCopy: ({ nodeMap, trendById, weeklyReview }) => {
      const graphiti = nodeMap.get(SHOWCASE_INGEST_NODE_ID);
      const agent = nodeMap.get("demo-agent");
      const trend =
        trendById.get(PROJECT_SUGGESTION_TREND_FIXTURE_ID) ??
        trendById.values().next().value;
      const trendRef = trend
        ? `${trend.id}「${trend.title}」`
        : PROJECT_SUGGESTION_TREND_FIXTURE_ID;
      const weeklyHint = weeklyReview
        ? ` 每周回顾 ${weeklyReview.weekId} 的 next_steps 也指向加强语音演示。`
        : "";
      return {
        worldItemId: trend?.id ?? PROJECT_SUGGESTION_TREND_FIXTURE_ID,
        intro:
          "基于图谱节点 Graphiti、AI Agent 与外部趋势信号，生成可确认的 GitHub Issue 草稿（未提交）。",
        reason: [
          `节点「${graphiti?.title ?? "Graphiti"}」已连到「${agent?.title ?? "AI Agent"}」，适合开一条 voice demo 引导 issue。`,
          `外部趋势 ${trendRef} 强调 speech-to-speech 打断能力，与沉浸式伴侣核心 loop 对齐。`,
          weeklyHint,
        ]
          .join("")
          .trim(),
        expectedImpact:
          "落地后可在演示脚本中串联 Graphiti 入库、Realtime 打断与 Agent 编排，减少口头解释成本。",
        suggestedNextStep:
          "在仓库新增 harness issue：复现 showcase 语音入库 + 星图高亮；引用 radar-wi-rel-1 作为趋势依据。",
      };
    },
  },
  {
    id: "pa-2",
    kind: "roadmap",
    title: "Roadmap 草稿 · Brain MCP 只读边界与 Agent 接入",
    linkedNodeIds: ["demo-mcp", "demo-agent"],
    buildCopy: ({ nodeMap }) => {
      const mcp = nodeMap.get("demo-mcp");
      const agent = nodeMap.get("demo-agent");
      return {
        intro:
          "基于 MCP 与 AI Agent 节点关系，整理只读 Brain MCP 与后续 Agent 工具接入的 roadmap 草稿。",
        reason: [
          `节点「${mcp?.title ?? "MCP"}」定义 Model Context Protocol 工具面；`,
          `「${agent?.title ?? "AI Agent"}」负责编排。`,
          "Brain MCP 当前保持只读（brain_search / brain_outline），project issue 创建需用户确认，不得自动写入 GitHub。",
        ].join(""),
        expectedImpact:
          "明确 F1 边界后，E2 项目建议与 E3 写作模式可共用 CognitiveAction draft 流程，避免误触外部写操作。",
        suggestedNextStep:
          "在 roadmap 中列出：只读 MCP 工具清单、issue 草稿 confirm 门控、后续 gh adapter 占位（disabled）。",
      };
    },
  },
];

function activeNodeMap(graph: BrainGraphSnapshot): Map<string, ConceptNode> {
  const map = new Map<string, ConceptNode>();
  for (const node of graph.nodes) {
    if (!node.archived) {
      map.set(node.id, node);
    }
  }
  return map;
}

function resolveLinkedIds(
  template: SuggestionTemplate,
  nodeMap: Map<string, ConceptNode>,
): string[] {
  const baseIds = template.linkedNodeIds.filter((id) => {
    if (id === template.optionalGraphitiNodeId && !nodeMap.has(id)) {
      return false;
    }
    return nodeMap.has(id);
  });
  if (baseIds.length > 0) {
    return baseIds;
  }
  const fallback = [...nodeMap.keys()].slice(0, 2);
  return fallback;
}

function buildCitations(
  linkedNodeIds: string[],
  nodeMap: Map<string, ConceptNode>,
): CognitiveActionCitation[] {
  return linkedNodeIds.map((id) => {
    const node = nodeMap.get(id);
    return {
      type: "node" as const,
      id,
      label: node?.title ?? id,
    };
  });
}

function buildActionFromTemplate(
  template: SuggestionTemplate,
  nodeMap: Map<string, ConceptNode>,
  trendById: Map<string, WorldItem>,
  weeklyReview: WeeklyBrainReview | undefined,
  createdAt: string,
): CognitiveAction | null {
  const linkedNodeIds = resolveLinkedIds(template, nodeMap);
  if (linkedNodeIds.length < 1) {
    return null;
  }
  const ctx: TemplateContext = { nodeMap, trendById, weeklyReview };
  const copy = template.buildCopy(ctx);
  const metadata: ProjectSuggestionMetadata = {
    linkedNodeIds,
    reason: copy.reason,
    expectedImpact: copy.expectedImpact,
    suggestedNextStep: copy.suggestedNextStep,
    worldItemId: copy.worldItemId,
  };
  for (const field of [copy.reason, copy.expectedImpact, copy.suggestedNextStep, copy.intro]) {
    if (containsBannedSuggestionPhrase(field)) {
      throw new Error(`generateProjectSuggestions: banned vague phrase in ${template.id}`);
    }
  }
  const bodyMarkdown = buildProjectSuggestionBodyMarkdown({
    intro: copy.intro,
    reason: copy.reason,
    expectedImpact: copy.expectedImpact,
    suggestedNextStep: copy.suggestedNextStep,
  });
  return createCognitiveAction({
    id: template.id,
    kind: template.kind,
    title: template.title,
    bodyMarkdown,
    citations: buildCitations(linkedNodeIds, nodeMap),
    metadata,
    createdAt,
  });
}

/** Deterministic mock — 1–3 draft project_issue/roadmap CognitiveActions. */
export function generateProjectSuggestions(
  input: GenerateProjectSuggestionsInput,
): GenerateProjectSuggestionsResult {
  const nodeMap = activeNodeMap(input.graph);
  if (nodeMap.size === 0) {
    return {
      actions: [],
      emptyReason: "图谱无可见节点，无法生成带引用的项目建议。",
    };
  }
  const trendItems = input.trendItems ?? RADAR_FIXTURE_WORLD_ITEMS;
  const trendById = new Map(trendItems.map((item) => [item.id, item]));
  const createdAt = input.createdAt ?? SHOWCASE_NOW;

  const actions: CognitiveAction[] = [];
  for (const template of SUGGESTION_TEMPLATES) {
    const action = buildActionFromTemplate(
      template,
      nodeMap,
      trendById,
      input.weeklyReview,
      createdAt,
    );
    if (action) {
      actions.push(action);
    }
  }

  return { actions };
}

export function projectSuggestionMatchesGoldenEntry(
  action: CognitiveAction,
  entry: (typeof PROJECT_SUGGESTIONS_GOLDEN)[number],
  options?: { includesGraphiti?: boolean },
): boolean {
  if (action.id !== entry.id || action.kind !== entry.kind) {
    return false;
  }
  if (action.permissionLevel !== "suggest" || action.status !== "draft") {
    return false;
  }
  if (!action.title.startsWith(entry.titlePrefix)) {
    return false;
  }
  const projectMeta = parseMetadataFromAction(action);
  if (!projectMeta || projectMeta.linkedNodeIds.length < 1) {
    return false;
  }
  for (const nodeId of entry.linkedNodeIds) {
    if (nodeId === entry.optionalGraphitiNodeId) {
      if (options?.includesGraphiti === false) {
        continue;
      }
      if (!projectMeta.linkedNodeIds.includes(nodeId)) {
        return false;
      }
      continue;
    }
    if (!projectMeta.linkedNodeIds.includes(nodeId)) {
      return false;
    }
  }
  const reasonBlob = `${projectMeta.reason} ${action.bodyMarkdown}`;
  for (const anchor of entry.reasonTitleAnchors) {
    if (!reasonBlob.includes(anchor)) {
      return false;
    }
  }
  let trendHit = false;
  for (const anchor of entry.reasonTrendAnchors) {
    if (reasonBlob.includes(anchor)) {
      trendHit = true;
      break;
    }
  }
  if (!trendHit && entry.id === "pa-1") {
    return false;
  }
  if (entry.id === "pa-2") {
    for (const anchor of entry.reasonTrendAnchors) {
      if (!reasonBlob.includes(anchor)) {
        return false;
      }
    }
  }
  return true;
}

export function projectSuggestionsMatchGolden(
  actions: CognitiveAction[],
  options?: { includesGraphiti?: boolean },
): boolean {
  if (actions.length !== PROJECT_SUGGESTIONS_GOLDEN.length) {
    return false;
  }
  for (const entry of PROJECT_SUGGESTIONS_GOLDEN) {
    const action = actions.find((row) => row.id === entry.id);
    if (!action || !projectSuggestionMatchesGoldenEntry(action, entry, options)) {
      return false;
    }
  }
  return true;
}

export function pa1IncludesGraphitiNode(actions: CognitiveAction[]): boolean {
  const pa1 = actions.find((row) => row.id === "pa-1");
  const metadata = pa1 ? parseMetadataFromAction(pa1) : null;
  return metadata?.linkedNodeIds.includes(SHOWCASE_INGEST_NODE_ID) ?? false;
}
