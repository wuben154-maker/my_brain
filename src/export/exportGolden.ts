import { SHOWCASE_NOW } from "@/showcase/showcaseFixtures";
import type { GraphExportJson } from "@/export/graphExportSchema";
import { GRAPH_EXPORT_SCHEMA_VERSION } from "@/export/graphExportSchema";

/** F2 — deterministic markdown golden for A1 showcase graph. */
export const EXPORT_MARKDOWN_GOLDEN = `# my_brain Graph Export

Exported: ${SHOWCASE_NOW}

## AI Agent

工具调用与任务编排

## BERT

双向编码器（已归档示例）

_Archived_

## LLM

大语言模型

## MCP

Model Context Protocol

## RAG

检索增强生成

## Self-Attention

Query/Key/Value 注意力机制

## Transformer

自注意力序列建模架构

**Sources:**
- Transformer (manual) — https://arxiv.org/abs/1706.03762
`;

/** F2 — deterministic JSON golden for A1 showcase graph. */
export const EXPORT_JSON_GOLDEN: GraphExportJson = {
  schemaVersion: GRAPH_EXPORT_SCHEMA_VERSION,
  exportedAt: SHOWCASE_NOW,
  nodes: [
    {
      id: "demo-agent",
      title: "AI Agent",
      intro: "工具调用与任务编排",
      archived: false,
      sourceRefs: [],
      updatedAt: SHOWCASE_NOW,
    },
    {
      id: "demo-bert",
      title: "BERT",
      intro: "双向编码器（已归档示例）",
      archived: true,
      sourceRefs: [],
      updatedAt: SHOWCASE_NOW,
    },
    {
      id: "demo-llm",
      title: "LLM",
      intro: "大语言模型",
      archived: false,
      sourceRefs: [],
      updatedAt: SHOWCASE_NOW,
    },
    {
      id: "demo-mcp",
      title: "MCP",
      intro: "Model Context Protocol",
      archived: false,
      sourceRefs: [],
      updatedAt: SHOWCASE_NOW,
    },
    {
      id: "demo-rag",
      title: "RAG",
      intro: "检索增强生成",
      archived: false,
      sourceRefs: [],
      updatedAt: SHOWCASE_NOW,
    },
    {
      id: "demo-attention",
      title: "Self-Attention",
      intro: "Query/Key/Value 注意力机制",
      archived: false,
      sourceRefs: [],
      updatedAt: SHOWCASE_NOW,
    },
    {
      id: "demo-transformer",
      title: "Transformer",
      intro: "自注意力序列建模架构",
      archived: false,
      sourceRefs: [
        {
          url: "https://arxiv.org/abs/1706.03762",
          title: "Transformer",
          kind: "manual",
          ingestedAt: SHOWCASE_NOW,
        },
      ],
      updatedAt: SHOWCASE_NOW,
    },
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
  ],
};
