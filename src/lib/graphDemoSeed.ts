import type { BrainGraphSnapshot } from "@/domain/graph";
import { isGraphDemoMode } from "@/lib/devOnlyGuards";
import {
  createShowcaseGraphSnapshot,
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_NOW,
} from "@/showcase/showcaseFixtures";

export { isGraphDemoMode, SHOWCASE_GRAPH_SNAPSHOT };
const NOW = SHOWCASE_NOW;

/** Dev-only snapshot for visual QA (`?graphDemo=1`). Aligned with showcase graph. */
export function createGraphDemoSnapshot(): BrainGraphSnapshot {
  return createShowcaseGraphSnapshot();
}

interface DemoNodeSeed {
  id: string;
  title: string;
  intro: string;
  archived?: boolean;
  sourceUrl?: string;
}

const RICH_NODES: DemoNodeSeed[] = [
  { id: "demo-llm", title: "LLM", intro: "大语言模型" },
  {
    id: "demo-transformer",
    title: "Transformer",
    intro: "自注意力序列建模架构",
    sourceUrl: "https://arxiv.org/abs/1706.03762",
  },
  { id: "demo-attention", title: "Self-Attention", intro: "Query/Key/Value 注意力机制" },
  { id: "demo-embedding", title: "Embedding", intro: "把符号映射为稠密向量" },
  { id: "demo-tokenization", title: "Tokenization", intro: "文本切分为 token" },
  { id: "demo-gpt", title: "GPT", intro: "生成式预训练 Transformer" },
  { id: "demo-moe", title: "MoE", intro: "混合专家稀疏激活" },
  { id: "demo-multimodal", title: "Multimodal", intro: "图文音多模态理解" },
  { id: "demo-diffusion", title: "Diffusion", intro: "扩散式生成模型" },
  { id: "demo-pretrain", title: "Pretraining", intro: "大规模自监督预训练" },
  { id: "demo-finetune", title: "Fine-tuning", intro: "下游任务微调" },
  { id: "demo-rlhf", title: "RLHF", intro: "人类反馈强化学习对齐" },
  { id: "demo-lora", title: "LoRA", intro: "低秩适配高效微调" },
  { id: "demo-rag", title: "RAG", intro: "检索增强生成" },
  { id: "demo-vectordb", title: "Vector DB", intro: "向量检索数据库" },
  { id: "demo-agent", title: "AI Agent", intro: "工具调用与任务编排" },
  { id: "demo-mcp", title: "MCP", intro: "Model Context Protocol" },
  { id: "demo-tooluse", title: "Tool Use", intro: "模型调用外部工具" },
  {
    id: "demo-bert",
    title: "BERT",
    intro: "双向编码器（已归档示例）",
    archived: true,
  },
];

const RICH_EDGES: Array<{
  source: string;
  target: string;
  relation: BrainGraphSnapshot["edges"][number]["relationType"];
}> = [
  { source: "demo-llm", target: "demo-transformer", relation: "depends_on" },
  { source: "demo-attention", target: "demo-transformer", relation: "is_a" },
  { source: "demo-transformer", target: "demo-embedding", relation: "depends_on" },
  { source: "demo-embedding", target: "demo-tokenization", relation: "depends_on" },
  { source: "demo-gpt", target: "demo-llm", relation: "is_a" },
  { source: "demo-moe", target: "demo-llm", relation: "related" },
  { source: "demo-multimodal", target: "demo-llm", relation: "related" },
  { source: "demo-gpt", target: "demo-multimodal", relation: "related" },
  { source: "demo-diffusion", target: "demo-multimodal", relation: "related" },
  { source: "demo-llm", target: "demo-pretrain", relation: "depends_on" },
  { source: "demo-finetune", target: "demo-pretrain", relation: "depends_on" },
  { source: "demo-rlhf", target: "demo-finetune", relation: "is_a" },
  { source: "demo-lora", target: "demo-finetune", relation: "is_a" },
  { source: "demo-rag", target: "demo-llm", relation: "depends_on" },
  { source: "demo-rag", target: "demo-vectordb", relation: "depends_on" },
  { source: "demo-vectordb", target: "demo-embedding", relation: "depends_on" },
  { source: "demo-agent", target: "demo-llm", relation: "depends_on" },
  { source: "demo-agent", target: "demo-tooluse", relation: "depends_on" },
  { source: "demo-agent", target: "demo-mcp", relation: "related" },
  { source: "demo-mcp", target: "demo-tooluse", relation: "related" },
  { source: "demo-agent", target: "demo-rag", relation: "related" },
  { source: "demo-bert", target: "demo-transformer", relation: "replaces" },
];

/**
 * Denser dev-only snapshot for the `?graphDemo` first-screen / visual QA.
 * Kept separate from `createGraphDemoSnapshot()` so the pinned `?visual=main`
 * pixel-regression baseline (7 fixed nodes) stays frozen.
 */
export function createRichGraphDemoSnapshot(): BrainGraphSnapshot {
  return {
    nodes: RICH_NODES.map((node) => ({
      id: node.id,
      title: node.title,
      intro: node.intro,
      sourceUrl: node.sourceUrl ?? null,
      sourceRefs: [],
      archived: node.archived ?? false,
      createdAt: NOW,
      updatedAt: NOW,
    })),
    edges: RICH_EDGES.map((edge, index) => ({
      id: `re${index + 1}`,
      sourceId: edge.source,
      targetId: edge.target,
      relationType: edge.relation,
    })),
  };
}

