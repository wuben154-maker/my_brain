import { createCognitiveAction } from "@/actions/createCognitiveAction";
import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import { migrateLegacySourceUrlToSourceRefs } from "@/domain/graph/sourceRef";
import type {
  BlogDraftMetadata,
  CognitiveAction,
  CognitiveActionCitation,
} from "@/domain/actions/cognitiveAction";
import {
  buildBlogDraftBodyMarkdown,
  parseBlogMetadataFromAction,
} from "@/domain/actions/writingResearchMetadata";
import { WRITING_RESEARCH_GOLDEN } from "@/cognitive/writingResearchGolden";
import {
  SHOWCASE_INGEST_NODE_ID,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";

export const DEFAULT_BLOG_PATH_NODE_IDS = [
  "demo-agent",
  "demo-mcp",
  SHOWCASE_INGEST_NODE_ID,
  "demo-rag",
] as const;

export const BLOG_DRAFT_GOLDEN_ID = "wr-blog-1";
export const BLOG_DRAFT_GOLDEN_TITLE = "my_brain 技术栈：从语音伴侣到知识 OS";

export interface GenerateBlogDraftInput {
  graph: BrainGraphSnapshot;
  pathNodeIds?: readonly string[];
  title?: string;
  id?: string;
  createdAt?: string;
}

export interface GenerateBlogDraftResult {
  action: CognitiveAction | null;
  warnings: string[];
}

interface SectionTemplate {
  nodeId: string;
  heading: string;
  buildBody: (node: ConceptNode) => string;
}

const SECTION_TEMPLATES: SectionTemplate[] = [
  {
    nodeId: "demo-agent",
    heading: "语音 Agent 编排",
    buildBody: (node) =>
      `${node.title} 负责工具调用与任务编排，是 my_brain 沉浸式伴侣的对话执行层。` +
      " 用户可随时打断，助手立即停说转听，入库门控仍由语音确认。",
  },
  {
    nodeId: "demo-mcp",
    heading: "MCP 工具边界",
    buildBody: (node) =>
      `${node.title}（Model Context Protocol）把 Brain 只读查询与外部工具接到 Agent。` +
      " CognitiveAction 草稿默认 suggest，不自动触发 GitHub 或博客发布。",
  },
  {
    nodeId: SHOWCASE_INGEST_NODE_ID,
    heading: "Graphiti 时序知识图谱",
    buildBody: (node) =>
      `节点「${node.title}」来自用户确认入库：${node.intro}` +
      " 其 sourceRefs 为博客「参考来源」节的首选引用。",
  },
  {
    nodeId: "demo-rag",
    heading: "RAG 检索增强",
    buildBody: (node) =>
      `${node.title} 把本地图谱上下文注入 LLM 任务，支撑简报、回顾与写作草稿生成。` +
      " 节点仍是概念 + 短简介，而非新闻碎片。",
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

function resolvePathNodeIds(
  requested: readonly string[],
  nodeMap: Map<string, ConceptNode>,
): { pathNodeIds: string[]; warnings: string[] } {
  const pathNodeIds: string[] = [];
  const warnings: string[] = [];
  for (const nodeId of requested) {
    if (nodeMap.has(nodeId)) {
      pathNodeIds.push(nodeId);
    } else {
      warnings.push(`path 节点缺失，已跳过: ${nodeId}`);
    }
  }
  return { pathNodeIds, warnings };
}

function buildReferenceLines(
  pathNodeIds: string[],
  nodeMap: Map<string, ConceptNode>,
): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];

  const orderedIds = [...pathNodeIds];
  if (nodeMap.has(SHOWCASE_INGEST_NODE_ID) && !orderedIds.includes(SHOWCASE_INGEST_NODE_ID)) {
    orderedIds.unshift(SHOWCASE_INGEST_NODE_ID);
  }

  for (const nodeId of orderedIds) {
    const node = nodeMap.get(nodeId);
    if (!node) {
      continue;
    }
    const refs = migrateLegacySourceUrlToSourceRefs(node);
    for (const ref of refs) {
      if (!ref.url || seen.has(ref.url)) {
        continue;
      }
      seen.add(ref.url);
      lines.push(`- [${ref.title}](${ref.url})`);
    }
  }
  return lines;
}

function buildSections(
  pathNodeIds: string[],
  nodeMap: Map<string, ConceptNode>,
): BlogDraftMetadata["sections"] {
  const sections: BlogDraftMetadata["sections"] = [];
  for (const template of SECTION_TEMPLATES) {
    if (!pathNodeIds.includes(template.nodeId)) {
      continue;
    }
    const node = nodeMap.get(template.nodeId);
    if (!node) {
      continue;
    }
    sections.push({
      heading: template.heading,
      body: template.buildBody(node),
      citations: [template.nodeId],
    });
  }
  return sections;
}

function buildCitations(
  sections: BlogDraftMetadata["sections"],
  nodeMap: Map<string, ConceptNode>,
): CognitiveActionCitation[] {
  const seen = new Set<string>();
  const citations: CognitiveActionCitation[] = [];
  for (const section of sections) {
    for (const nodeId of section.citations) {
      if (seen.has(nodeId)) {
        continue;
      }
      seen.add(nodeId);
      const node = nodeMap.get(nodeId);
      citations.push({
        type: "node",
        id: nodeId,
        label: node?.title ?? nodeId,
      });
    }
  }
  return citations;
}

/** Deterministic mock — blog_draft CognitiveAction along a graph path. */
export function generateBlogDraft(input: GenerateBlogDraftInput): GenerateBlogDraftResult {
  const nodeMap = activeNodeMap(input.graph);
  const requested = input.pathNodeIds ?? DEFAULT_BLOG_PATH_NODE_IDS;
  const { pathNodeIds, warnings } = resolvePathNodeIds(requested, nodeMap);

  if (pathNodeIds.length < 1) {
    return {
      action: null,
      warnings: [...warnings, "path 无可用节点，无法生成 blog draft。"],
    };
  }

  const sections = buildSections(pathNodeIds, nodeMap);
  if (sections.length < 1) {
    return {
      action: null,
      warnings: [...warnings, "无可用 section，无法生成 blog draft。"],
    };
  }

  const referenceLines = buildReferenceLines(pathNodeIds, nodeMap);
  const title = input.title ?? BLOG_DRAFT_GOLDEN_TITLE;
  const metadata: BlogDraftMetadata = { pathNodeIds, sections };
  const bodyMarkdown = buildBlogDraftBodyMarkdown({
    title,
    sections,
    referenceLines,
  });

  const action = createCognitiveAction({
    id: input.id ?? BLOG_DRAFT_GOLDEN_ID,
    kind: "blog_draft",
    title,
    bodyMarkdown,
    citations: buildCitations(sections, nodeMap),
    metadata,
    createdAt: input.createdAt ?? SHOWCASE_NOW,
  });

  return { action, warnings };
}

export function blogDraftMatchesGoldenEntry(
  action: CognitiveAction,
  entry: (typeof WRITING_RESEARCH_GOLDEN)[number],
  options?: { includesGraphiti?: boolean },
): boolean {
  if (action.id !== entry.id || action.kind !== entry.kind) {
    return false;
  }
  if (action.permissionLevel !== "suggest" || action.status !== "draft") {
    return false;
  }
  if (action.title !== entry.title) {
    return false;
  }
  const metadata = parseBlogMetadataFromAction(action);
  if (!metadata || metadata.sections.length < (entry.minSections ?? 1)) {
    return false;
  }
  if (entry.pathNodeIds) {
    for (const nodeId of entry.pathNodeIds) {
      if (nodeId === entry.optionalGraphitiNodeId) {
        if (options?.includesGraphiti === false) {
          continue;
        }
      }
      if (!metadata.pathNodeIds.includes(nodeId)) {
        return false;
      }
    }
  }
  for (const section of metadata.sections) {
    if (section.citations.length < 1) {
      return false;
    }
    for (const nodeId of section.citations) {
      if (!metadata.pathNodeIds.includes(nodeId)) {
        return false;
      }
    }
  }
  for (const url of entry.requiredReferenceUrls ?? []) {
    if (
      options?.includesGraphiti === false &&
      url.includes("graphiti")
    ) {
      continue;
    }
    if (!action.bodyMarkdown.includes(url)) {
      return false;
    }
  }
  for (const anchor of entry.sectionHeadingAnchors ?? []) {
    if (!action.bodyMarkdown.includes(anchor)) {
      return false;
    }
  }
  return true;
}

export function blogDraftMatchesGolden(
  action: CognitiveAction,
  options?: { includesGraphiti?: boolean },
): boolean {
  const entry = WRITING_RESEARCH_GOLDEN.find((row) => row.id === BLOG_DRAFT_GOLDEN_ID);
  if (!entry) {
    return false;
  }
  return blogDraftMatchesGoldenEntry(action, entry, options);
}
