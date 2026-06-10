import { createCognitiveAction } from "@/actions/createCognitiveAction";
import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import { isConceptNode, nodeSourceRefs } from "@/domain/graph";
import type {
  CognitiveAction,
  CognitiveActionCitation,
  ResearchFollowupMetadata,
} from "@/domain/actions/cognitiveAction";
import {
  buildResearchFollowupBodyMarkdown,
  containsBannedResearchPhrase,
  parseResearchMetadataFromAction,
} from "@/domain/actions/writingResearchMetadata";
import type { WorldItem } from "@/domain/radar/worldItem";
import { WRITING_RESEARCH_GOLDEN } from "@/cognitive/writingResearchGolden";
import {
  RADAR_FIXTURE_CATEGORY_COUNTS,
  RADAR_FIXTURE_WORLD_ITEM_CATEGORIES,
  RADAR_FIXTURE_WORLD_ITEMS,
} from "@/radar/worldSources/fixtureWorldSource";
import { SHOWCASE_NOW } from "@/showcase/showcaseFixtures";

export const RESEARCH_FOLLOWUP_GOLDEN_ID = "wr-research-1";
export const RESEARCH_FOLLOWUP_SEED_NODE_ID = "demo-rag";
export const RESEARCH_FOLLOWUP_ITEM_COUNT = 3;

export interface GenerateResearchFollowupsInput {
  graph: BrainGraphSnapshot;
  seedNodeId?: string;
  worldItems?: WorldItem[];
  id?: string;
  createdAt?: string;
}

export interface GenerateResearchFollowupsResult {
  action: CognitiveAction | null;
  warnings: string[];
}

interface ResearchTemplate {
  worldItemId: string;
  buildReason: (ctx: TemplateContext) => string;
}

interface TemplateContext {
  seedNode: ConceptNode;
  item: WorldItem;
}

const RESEARCH_TEMPLATES: ResearchTemplate[] = [
  {
    worldItemId: "radar-wi-rel-2",
    buildReason: ({ seedNode, item }) =>
      `与 ${seedNode.title} 相关的 MCP 路由实践：${item.title} 可补充 Agent 工具接入案例，适合后续 voice demo 引用。`,
  },
  {
    worldItemId: "radar-wi-rel-3",
    buildReason: ({ seedNode, item }) =>
      `${item.title} 讨论个人 AI 的图谱记忆，可对照 ${seedNode.title} 检索链路与 Graphiti 入库路径（追踪 ≠ 入库）。`,
  },
  {
    worldItemId: "radar-wi-rel-5",
    buildReason: ({ seedNode, item }) =>
      `${item.title} 与本地优先 SQLite 存储策略一致，可评估 ${seedNode.title} 上下文包缓存与离线演示成本。`,
  },
];

const QUERY_ONLY_FALLBACK: ResearchFollowupMetadata["researchItems"] = [
  {
    label: "RAG 评测基准",
    reason: "seed 节点周边缺少可用 WorldItem，降级为 query-only 追踪项。",
    query: "RAG retrieval benchmark companion agent 2026",
  },
  {
    label: "语音伴侣上下文包",
    reason: "补充检索本地优先 companion 的 context pack 设计讨论。",
    query: "voice companion context pack local-first",
  },
  {
    label: "Graph memory follow-up",
    reason: "对照时序知识图谱与个人 Brain 的产品边界，仅作阅读队列。",
    query: "temporal knowledge graph personal assistant",
  },
];

const DUPLICATE_FIXTURE_IDS = new Set(
  RADAR_FIXTURE_WORLD_ITEM_CATEGORIES.filter((row) => row.category === "duplicate").map(
    (row) => row.id,
  ),
);

function activeNodeMap(graph: BrainGraphSnapshot): Map<string, ConceptNode> {
  const map = new Map<string, ConceptNode>();
  for (const node of graph.nodes) {
    if (!node.archived && isConceptNode(node)) {
      map.set(node.id, node);
    }
  }
  return map;
}

function ingestedWorldItemIds(graph: BrainGraphSnapshot): Set<string> {
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    for (const ref of nodeSourceRefs(node)) {
      if (ref.worldItemId) {
        ids.add(ref.worldItemId);
      }
    }
  }
  return ids;
}

function isEligibleWorldItem(
  item: WorldItem,
  ingestedIds: Set<string>,
): boolean {
  if (DUPLICATE_FIXTURE_IDS.has(item.id)) {
    return false;
  }
  if (item.duplicateOf) {
    return false;
  }
  if (ingestedIds.has(item.id)) {
    return false;
  }
  return true;
}

function buildResearchItems(
  seedNode: ConceptNode,
  worldItems: WorldItem[],
  ingestedIds: Set<string>,
): ResearchFollowupMetadata["researchItems"] {
  const byId = new Map(worldItems.map((item) => [item.id, item]));
  const items: ResearchFollowupMetadata["researchItems"] = [];

  for (const template of RESEARCH_TEMPLATES) {
    const candidate = byId.get(template.worldItemId);
    if (!candidate || !isEligibleWorldItem(candidate, ingestedIds)) {
      continue;
    }
    const reason = template.buildReason({ seedNode, item: candidate });
    if (containsBannedResearchPhrase(reason)) {
      throw new Error(`generateResearchFollowups: banned phrase in ${template.worldItemId}`);
    }
    items.push({
      label: candidate.title,
      reason,
      worldItemId: candidate.id,
    });
    if (items.length >= RESEARCH_FOLLOWUP_ITEM_COUNT) {
      break;
    }
  }

  if (items.length >= RESEARCH_FOLLOWUP_ITEM_COUNT) {
    return items;
  }

  for (const item of worldItems) {
    if (items.length >= RESEARCH_FOLLOWUP_ITEM_COUNT) {
      break;
    }
    if (!isEligibleWorldItem(item, ingestedIds)) {
      continue;
    }
    if (items.some((row) => row.worldItemId === item.id)) {
      continue;
    }
    const reason =
      `与 ${seedNode.title} 相关的阅读队列：${item.summary.trim()}（fixture 追踪，不会自动 ingest）。`;
    if (containsBannedResearchPhrase(reason)) {
      continue;
    }
    items.push({
      label: item.title,
      reason,
      worldItemId: item.id,
    });
  }

  if (items.length >= RESEARCH_FOLLOWUP_ITEM_COUNT) {
    return items.slice(0, RESEARCH_FOLLOWUP_ITEM_COUNT);
  }

  if (items.length === 0) {
    return QUERY_ONLY_FALLBACK;
  }

  while (items.length < RESEARCH_FOLLOWUP_ITEM_COUNT) {
    const fallback = QUERY_ONLY_FALLBACK[items.length];
    if (fallback) {
      items.push(fallback);
    } else {
      break;
    }
  }
  return items.slice(0, RESEARCH_FOLLOWUP_ITEM_COUNT);
}

/** Deterministic mock — research_followup CognitiveAction (no graph writes). */
export function generateResearchFollowups(
  input: GenerateResearchFollowupsInput,
): GenerateResearchFollowupsResult {
  const nodeMap = activeNodeMap(input.graph);
  const seedNodeId = input.seedNodeId ?? RESEARCH_FOLLOWUP_SEED_NODE_ID;
  const seedNode = nodeMap.get(seedNodeId);
  const warnings: string[] = [];

  if (!seedNode) {
    return {
      action: null,
      warnings: [`seed 节点缺失: ${seedNodeId}`],
    };
  }

  const worldItems = input.worldItems ?? RADAR_FIXTURE_WORLD_ITEMS;
  if (worldItems.length === 0) {
    warnings.push("worldItems 为空，降级为 query-only 追踪项。");
  }

  const ingestedIds = ingestedWorldItemIds(input.graph);
  const researchItems = buildResearchItems(seedNode, worldItems, ingestedIds);
  const metadata: ResearchFollowupMetadata = { researchItems };
  const title = `研究追踪 · ${seedNode.title}`;
  const bodyMarkdown = buildResearchFollowupBodyMarkdown({
    seedLabel: seedNode.title,
    items: researchItems,
  });

  const action = createCognitiveAction({
    id: input.id ?? RESEARCH_FOLLOWUP_GOLDEN_ID,
    kind: "research_followup",
    title,
    bodyMarkdown,
    citations: [
      {
        type: "node",
        id: seedNode.id,
        label: seedNode.title,
      },
    ],
    metadata,
    createdAt: input.createdAt ?? SHOWCASE_NOW,
  });

  return { action, warnings };
}

export function researchFollowupMatchesGoldenEntry(
  action: CognitiveAction,
  entry: (typeof WRITING_RESEARCH_GOLDEN)[number],
): boolean {
  if (action.id !== entry.id || action.kind !== entry.kind) {
    return false;
  }
  if (action.permissionLevel !== "suggest" || action.status !== "draft") {
    return false;
  }
  const metadata = parseResearchMetadataFromAction(action);
  if (!metadata || metadata.researchItems.length !== (entry.researchItemCount ?? 0)) {
    return false;
  }
  for (const item of metadata.researchItems) {
    if (!item.reason.trim()) {
      return false;
    }
    if (!item.worldItemId && !item.query) {
      return false;
    }
    if (containsBannedResearchPhrase(item.reason)) {
      return false;
    }
  }
  for (const worldItemId of entry.requiredWorldItemIds ?? []) {
    if (!metadata.researchItems.some((item) => item.worldItemId === worldItemId)) {
      return false;
    }
  }
  if (entry.seedNodeId) {
    const seedCitation = action.citations.find((row) => row.type === "node");
    if (seedCitation?.id !== entry.seedNodeId) {
      return false;
    }
  }
  return true;
}

export function researchFollowupMatchesGolden(action: CognitiveAction): boolean {
  const entry = WRITING_RESEARCH_GOLDEN.find((row) => row.id === RESEARCH_FOLLOWUP_GOLDEN_ID);
  if (!entry) {
    return false;
  }
  return researchFollowupMatchesGoldenEntry(action, entry);
}

export function researchUsesDuplicateIngestClaim(action: CognitiveAction): boolean {
  const metadata = parseResearchMetadataFromAction(action);
  if (!metadata) {
    return false;
  }
  return metadata.researchItems.some((item) => containsBannedResearchPhrase(item.reason) !== null);
}

export function researchFixtureDuplicateCount(): number {
  return RADAR_FIXTURE_CATEGORY_COUNTS.duplicate;
}

export function buildResearchCitation(seedNode: ConceptNode): CognitiveActionCitation {
  return { type: "node", id: seedNode.id, label: seedNode.title };
}
