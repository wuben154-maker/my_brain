/** KOS-C3 — deterministic interview pack golden (mock path). */
export interface InterviewPackGoldenEntry {
  id: string;
  promptPrefix: string;
  linkedNodeIds: string[];
}

/** Base A1 showcase graph (no post-ingest graphiti). */
export const INTERVIEW_PACK_GOLDEN: InterviewPackGoldenEntry[] = [
  {
    id: "iq-1",
    promptPrefix: "为什么 my_brain 选择 OpenAI Realtime 而不是",
    linkedNodeIds: ["demo-agent"],
  },
  {
    id: "iq-2",
    promptPrefix: "解释用户确认入库与自动整理",
    linkedNodeIds: ["demo-agent", "demo-mcp"],
  },
  {
    id: "iq-3",
    promptPrefix: "MemoryProvider 与 autoCurate 的边界",
    linkedNodeIds: ["demo-mcp"],
  },
  {
    id: "iq-4",
    promptPrefix: "Barge-in 在产品里为什么硬需求",
    linkedNodeIds: ["demo-agent"],
  },
  {
    id: "iq-5",
    promptPrefix: "如果不用普通 RAG，你怎么向面试官解释",
    linkedNodeIds: ["demo-rag", "demo-llm"],
  },
];

export const INTERVIEW_POST_INGEST_EXTRA_NODE_ID = "showcase-ingest-graphiti";
