import type { SelfCheckItem } from "@/stores/appStore";

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
