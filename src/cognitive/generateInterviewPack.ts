import type { BrainGraphSnapshot, ConceptNode } from "@/domain/graph";
import { isConceptNode } from "@/domain/graph";
import { migrateLegacySourceUrlToSourceRefs } from "@/domain/graph/sourceRef";
import type { UserProfile } from "@/domain/profile";
import type {
  InterviewDepth,
  InterviewFollowUp,
  InterviewPack,
  InterviewQuestion,
} from "@/domain/actions/interviewQuestion";
import { resolveUnderstandingLevel } from "@/conversation/teachingDepth";
import {
  INTERVIEW_POST_INGEST_EXTRA_NODE_ID,
  INTERVIEW_PACK_GOLDEN,
} from "@/cognitive/interviewPackGolden";
import { SHOWCASE_INGEST_NODE_ID } from "@/showcase/showcaseFixtures";
import type { UnderstandingLevel } from "@/domain/profile/userProfile";

export interface GenerateInterviewPackOptions {
  project?: string;
}

interface QuestionTemplate {
  id: string;
  promptBody: string;
  linkedNodeIds: string[];
  /** Optional extra node id appended when present in graph (iq-1 graphiti). */
  optionalLinkedNodeId?: string;
  depthConceptId: string;
}

const QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: "iq-1",
    promptBody:
      "为什么 my_brain 选择 OpenAI Realtime 而不是纯 STT+LLM+TTS 链路？结合语音打断与 Agent 编排说明取舍。",
    linkedNodeIds: ["demo-agent"],
    optionalLinkedNodeId: SHOWCASE_INGEST_NODE_ID,
    depthConceptId: "demo-agent",
  },
  {
    id: "iq-2",
    promptBody:
      "解释用户确认入库与自动整理（merge/archive/link）在产品 invariant 里如何分工？",
    linkedNodeIds: ["demo-agent", "demo-mcp"],
    depthConceptId: "demo-agent",
  },
  {
    id: "iq-3",
    promptBody:
      "MemoryProvider 与 autoCurate 的边界是什么？谁可以写图谱，谁只能读？",
    linkedNodeIds: ["demo-mcp"],
    depthConceptId: "demo-mcp",
  },
  {
    id: "iq-4",
    promptBody:
      "Barge-in 在产品里为什么硬需求？Realtime 会话里如何实现可打断语音？",
    linkedNodeIds: ["demo-agent"],
    depthConceptId: "demo-agent",
  },
  {
    id: "iq-5",
    promptBody:
      "如果不用普通 RAG，你怎么向面试官解释 my_brain 的图谱检索 + 概念节点模型？",
    linkedNodeIds: ["demo-rag", "demo-llm"],
    depthConceptId: "demo-rag",
  },
];

const ARCHITECTURE_FOLLOW_UP =
  "追问：从架构层面，你会如何论证这个取舍在延迟、成本与可维护性上的平衡？";

const UNFAMILIAR_SCAFFOLDS: Record<string, string> = {
  "demo-agent":
    "提示：Agent 负责工具调用与任务编排；可先回忆 VoiceProvider 与 LLM 的分层。",
  "demo-mcp":
    "提示：MCP 是 Model Context Protocol，把外部工具以标准接口暴露给 Agent。",
  "demo-rag":
    "提示：RAG 把检索与生成结合；本项目更强调概念图谱而非纯向量片段库。",
};

function activeNodeMap(graph: BrainGraphSnapshot): Map<string, ConceptNode> {
  const map = new Map<string, ConceptNode>();
  for (const node of graph.nodes) {
    if (!node.archived && isConceptNode(node)) {
      map.set(node.id, node);
    }
  }
  return map;
}

function resolveLinkedIds(
  template: QuestionTemplate,
  nodeMap: Map<string, ConceptNode>,
): string[] {
  const ids = [...template.linkedNodeIds];
  if (
    template.optionalLinkedNodeId &&
    nodeMap.has(template.optionalLinkedNodeId)
  ) {
    ids.push(template.optionalLinkedNodeId);
  }
  return ids.filter((id) => nodeMap.has(id));
}

function collectSourceRefs(
  linkedIds: string[],
  nodeMap: Map<string, ConceptNode>,
): InterviewQuestion["linkedSourceRefs"] {
  const refs: InterviewQuestion["linkedSourceRefs"] = [];
  for (const id of linkedIds) {
    const node = nodeMap.get(id);
    if (!node) {
      continue;
    }
    const nodeRefs = migrateLegacySourceUrlToSourceRefs(node);
    for (const ref of nodeRefs) {
      refs.push(ref);
    }
  }
  return refs;
}

function depthForLevel(level: UnderstandingLevel): InterviewDepth {
  switch (level) {
    case "can_explain":
      return "advanced";
    case "heard":
      return "intermediate";
    case "unfamiliar":
    default:
      return "foundational";
  }
}

function buildFollowUps(
  level: UnderstandingLevel,
  conceptId: string,
): InterviewFollowUp[] {
  const followUps: InterviewFollowUp[] = [
    {
      prompt: `如果面试官追问「你在 my_brain 里具体怎么落地 ${conceptId}？」你会怎么答？`,
    },
  ];
  if (level === "can_explain") {
    followUps.push({ prompt: ARCHITECTURE_FOLLOW_UP });
  }
  return followUps;
}

function buildScaffold(level: UnderstandingLevel, conceptId: string): string | undefined {
  if (level !== "unfamiliar") {
    return undefined;
  }
  return UNFAMILIAR_SCAFFOLDS[conceptId];
}

function buildQuestion(
  template: QuestionTemplate,
  nodeMap: Map<string, ConceptNode>,
  profile: UserProfile,
): InterviewQuestion | null {
  const linkedNodeIds = resolveLinkedIds(template, nodeMap);
  if (linkedNodeIds.length === 0) {
    return null;
  }
  const level = resolveUnderstandingLevel(profile, template.depthConceptId);
  return {
    id: template.id,
    prompt: template.promptBody,
    linkedNodeIds,
    linkedSourceRefs: collectSourceRefs(linkedNodeIds, nodeMap),
    depth: depthForLevel(level),
    scaffold: buildScaffold(level, template.depthConceptId),
    followUps: buildFollowUps(level, template.depthConceptId),
  };
}

export function generateInterviewPack(
  graph: BrainGraphSnapshot,
  profile: UserProfile,
  options: GenerateInterviewPackOptions = {},
): InterviewPack {
  const nodeMap = activeNodeMap(graph);
  const questions: InterviewQuestion[] = [];

  for (const template of QUESTION_TEMPLATES) {
    const question = buildQuestion(template, nodeMap, profile);
    if (question) {
      questions.push(question);
    }
  }

  if (questions.length < 5) {
    throw new Error(
      `generateInterviewPack: need ≥5 questions but got ${questions.length} — 先入库更多概念。`,
    );
  }

  return {
    questions,
    project: options.project ?? "my_brain",
  };
}

/** Test helper — compare pack to golden prefix + linked ids (ignores depth/scaffold). */
export function interviewPackMatchesGolden(
  pack: InterviewPack,
  golden: typeof INTERVIEW_PACK_GOLDEN,
): boolean {
  if (pack.questions.length < golden.length) {
    return false;
  }
  for (const entry of golden) {
    const question = pack.questions.find((q) => q.id === entry.id);
    if (!question) {
      return false;
    }
    if (!question.prompt.startsWith(entry.promptPrefix)) {
      return false;
    }
    for (const nodeId of entry.linkedNodeIds) {
      if (!question.linkedNodeIds.includes(nodeId)) {
        return false;
      }
    }
  }
  return true;
}

export function iq1IncludesPostIngestNode(pack: InterviewPack): boolean {
  const iq1 = pack.questions.find((q) => q.id === "iq-1");
  return iq1?.linkedNodeIds.includes(INTERVIEW_POST_INGEST_EXTRA_NODE_ID) ?? false;
}
