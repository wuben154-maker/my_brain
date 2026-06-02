import type { BrainGraphSnapshot } from "@/domain/graph";

const NOW = "2026-06-01T00:00:00.000Z";

/** Dev-only snapshot for visual QA (`?graphDemo=1`). */
export function createGraphDemoSnapshot(): BrainGraphSnapshot {
  return {
    nodes: [
      {
        id: "demo-transformer",
        title: "Transformer",
        intro: "自注意力序列建模架构",
        sourceUrl: "https://arxiv.org/abs/1706.03762",
        archived: false,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: "demo-attention",
        title: "Self-Attention",
        intro: "Query/Key/Value 注意力机制",
        sourceUrl: null,
        archived: false,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: "demo-rag",
        title: "RAG",
        intro: "检索增强生成",
        sourceUrl: null,
        archived: false,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: "demo-agent",
        title: "AI Agent",
        intro: "工具调用与任务编排",
        sourceUrl: null,
        archived: false,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: "demo-llm",
        title: "LLM",
        intro: "大语言模型",
        sourceUrl: null,
        archived: false,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: "demo-mcp",
        title: "MCP",
        intro: "Model Context Protocol",
        sourceUrl: null,
        archived: false,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: "demo-bert",
        title: "BERT",
        intro: "双向编码器（已归档示例）",
        sourceUrl: null,
        archived: true,
        createdAt: NOW,
        updatedAt: NOW,
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
}

export function isGraphDemoMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).has("graphDemo");
}
