import type { MemoryItem } from "@/providers/memory/types";

export interface RecallEvalCase {
  id: string;
  seedItems: MemoryItem[];
  query: string;
  /** At least one substring must appear in a top-K recalled item text. */
  expectedInRecall: string[];
}

export interface EvolutionRoundFixture {
  transcript: string;
}

export interface EvolutionEvalCase {
  id: string;
  /** Cumulative topic targets — match rate should rise as rounds accumulate. */
  cumulativeMatchTopics: string[];
  rounds: EvolutionRoundFixture[];
}

const TS = 1_700_000_000_000;

/** Fixed memory corpus for deterministic recall@k evaluation. */
export const RECALL_EVAL_CASES: RecallEvalCase[] = [
  {
    id: "rag-fact",
    seedItems: [
      {
        kind: "fact",
        text: "用户关注 RAG 向量检索与召回质量",
        timestamp: TS,
      },
      {
        kind: "episode",
        text: "对话摘要：讨论过多模态模型发布",
        timestamp: TS + 1,
      },
    ],
    query: "RAG 向量检索怎么做",
    expectedInRecall: ["RAG"],
  },
  {
    id: "agent-interest",
    seedItems: [
      {
        kind: "episode",
        text: "对话摘要：用户对 AI Agent 框架很感兴趣",
        timestamp: TS + 10,
      },
      {
        kind: "fact",
        text: "用户习惯每天早上看 GitHub 趋势",
        timestamp: TS + 11,
      },
    ],
    query: "AI Agent 框架",
    expectedInRecall: ["Agent"],
  },
  {
    id: "context-window",
    seedItems: [
      {
        kind: "fact",
        text: "用户正在学习 Transformer 上下文窗口原理",
        timestamp: TS + 20,
      },
    ],
    query: "Transformer 上下文窗口",
    expectedInRecall: ["上下文窗口"],
  },
];

/** Multi-round transcripts — profile distillation should monotonically match topics. */
export const EVOLUTION_EVAL_CASE: EvolutionEvalCase = {
  id: "profile-growth-curve",
  cumulativeMatchTopics: ["AI 资讯", "AI Agent", "RAG"],
  rounds: [
    {
      transcript: "用户: 我想追一下 AI 资讯\n助手: 好的，我们从今天的热点开始。",
    },
    {
      transcript:
        "用户: 我对 AI Agent 很感兴趣，不太懂 RAG，讲得细一点\n助手: 没问题。",
    },
    {
      transcript:
        "用户: 我已经会用 Transformer 了，还想了解上下文窗口\n助手: 好的。",
    },
  ],
};
