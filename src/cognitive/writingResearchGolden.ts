import type { CognitiveActionKind } from "@/domain/actions/cognitiveAction";
import { SHOWCASE_INGEST_NODE_ID } from "@/showcase/showcaseFixtures";

export interface WritingResearchGoldenEntry {
  id: string;
  kind: CognitiveActionKind;
  title: string;
  pathNodeIds?: string[];
  optionalGraphitiNodeId?: string;
  minSections?: number;
  sectionHeadingAnchors?: string[];
  requiredReferenceUrls?: string[];
  seedNodeId?: string;
  researchItemCount?: number;
  requiredWorldItemIds?: string[];
}

export const WRITING_RESEARCH_GOLDEN: WritingResearchGoldenEntry[] = [
  {
    id: "wr-blog-1",
    kind: "blog_draft",
    title: "my_brain 技术栈：从语音伴侣到知识 OS",
    pathNodeIds: ["demo-agent", "demo-mcp", SHOWCASE_INGEST_NODE_ID, "demo-rag"],
    optionalGraphitiNodeId: SHOWCASE_INGEST_NODE_ID,
    minSections: 3,
    sectionHeadingAnchors: ["语音 Agent 编排", "MCP 工具边界", "RAG 检索增强"],
    requiredReferenceUrls: ["https://example.com/graphiti"],
  },
  {
    id: "wr-research-1",
    kind: "research_followup",
    title: "研究追踪 · RAG",
    seedNodeId: "demo-rag",
    researchItemCount: 3,
    requiredWorldItemIds: ["radar-wi-rel-2", "radar-wi-rel-3", "radar-wi-rel-5"],
  },
];

export const WRITING_RESEARCH_GOLDEN_IDS = WRITING_RESEARCH_GOLDEN.map((row) => row.id);
