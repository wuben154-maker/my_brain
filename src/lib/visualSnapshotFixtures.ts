import { toResearchTempId } from "@/agent/jobs/topicResearchJob";
import type { AgentTraceStep, ProposalEnvelope } from "@/agent/types";
import type { BrainGraphSnapshot } from "@/domain/graph";
import type { VisualRelationKind } from "@/lib/graphVisualTokens";
import { SHOWCASE_VOICE_SCRIPT } from "@/showcase/showcaseFixtures";
import type { ResearchRunRecord } from "@/stores/researchRunStore";
import type { SelfCheckItem } from "@/stores/appStore";

export { SHOWCASE_VOICE_SCRIPT };

const VISUAL_GRAPH_NOW = "2026-06-01T00:00:00.000Z";

export const VISUAL_INSIGHT_RUN_ID = "visual-research-run";

/** Research trace + batch proposals for insight visual smoke (`?visual=insight`). */
export const VISUAL_INSIGHT_TRACE: AgentTraceStep[] = [
  {
    stepId: "visual-plan",
    name: "plan",
    startedAt: "2026-06-02T08:00:00.000Z",
    finishedAt: "2026-06-02T08:00:01.200Z",
    tokensUsed: 140,
    inputSummary: "RAG 与 Agent 编排",
    outputSummary: "3 个子问题",
  },
  {
    stepId: "visual-synth",
    name: "synthesize",
    startedAt: "2026-06-02T08:00:01.200Z",
    finishedAt: "2026-06-02T08:00:02.800Z",
    tokensUsed: 360,
    outputSummary: "2 个概念候选",
  },
];

export const VISUAL_INSIGHT_RUN: ResearchRunRecord = {
  runId: VISUAL_INSIGHT_RUN_ID,
  topic: "RAG 与 Agent",
  trace: VISUAL_INSIGHT_TRACE,
  digest: {
    title: "RAG 与 Agent 编排要点",
    sections: [
      {
        headline: "检索增强",
        body: "RAG 为模型外接知识检索，降低幻觉。",
      },
    ],
    generatedAt: "2026-06-02T08:00:03.000Z",
  },
  finishedAt: "2026-06-02T08:00:03.000Z",
};

const visualInsightTempId = toResearchTempId("视觉调研概念");

export const VISUAL_INSIGHT_ENVELOPES: ProposalEnvelope[] = [
  {
    id: "visual-insight-env-1",
    runId: VISUAL_INSIGHT_RUN_ID,
    createdAt: "2026-06-02T08:00:03.000Z",
    source: "research_loop",
    status: "pending",
    proposal: {
      id: "visual-insight-prop-create",
      kind: "create",
      summary: "新建「视觉调研概念」",
      payload: {
        title: "视觉调研概念",
        intro: "洞察分区冒烟用待确认节点",
        sourceUrl: null,
      },
    },
  },
  {
    id: "visual-insight-env-2",
    runId: VISUAL_INSIGHT_RUN_ID,
    createdAt: "2026-06-02T08:00:03.000Z",
    source: "research_loop",
    status: "pending",
    proposal: {
      id: "visual-insight-prop-link",
      kind: "link",
      summary: "关联 demo-rag",
      payload: {
        sourceId: visualInsightTempId,
        targetId: "demo-rag",
        relationType: "related",
      },
    },
  },
];

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
  {
    id: "vault",
    label: "User Data Vault",
    detail: "Verifying personal data integrity",
    status: "pending",
  },
  {
    id: "plugins",
    label: "Plugins & Extensions",
    detail: "Loading installed modules",
    status: "pending",
  },
  {
    id: "security",
    label: "Security Protocols",
    detail: "Establishing secure enclave",
    status: "pending",
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

/** V2 companion-selfcheck snapshot: 4 passed + brain I/O syncing (§5.1). */
export const VISUAL_COMPANION_SELFCHECK_CHECKS: SelfCheckItem[] = [
  { id: "mic", label: "麦克风", status: "ok" },
  { id: "speaker", label: "扬声器", status: "ok" },
  { id: "network", label: "网络", status: "ok" },
  { id: "news", label: "资讯源", status: "ok" },
  {
    id: "storage",
    label: "大脑读写",
    status: "syncing",
    detail: "正在验证本地知识库",
  },
];

export const VISUAL_COMPANION_SELFCHECK_PROGRESS = 80;

/** Pending proposal for inbox visual smoke (`?visual=inbox`). */
export const VISUAL_INBOX_ENVELOPE: ProposalEnvelope = {
  id: "visual-prop-create-1",
  runId: "visual-run",
  createdAt: "2026-06-02T08:00:00.000Z",
  source: "background_ingest",
  status: "pending",
  proposal: {
    id: "visual-prop-create-1",
    kind: "create",
    summary: "新建概念「视觉回归样例」",
    payload: {
      title: "视觉回归样例",
      intro: "收件箱冒烟用待确认节点",
      sourceUrl: null,
    },
  },
};

/** Pinned layout for `?visual=companion` hub-and-spoke knowledge graph captures. */
/** Scale hub-and-spoke coords — spread clusters to quadrants without clipping labels. */
function companionPin(x: number, y: number): { x: number; y: number } {
  const scale = 0.82;
  return { x: Math.round(x * scale), y: Math.round(y * scale) };
}

export const VISUAL_GRAPH_PINNED_POSITIONS: Record<
  string,
  { x: number; y: number }
> = {
  "vis-ai": { x: 0, y: 0 },
  "vis-ml": companionPin(-118, -88),
  "vis-cv": companionPin(112, -86),
  "vis-nlp": companionPin(-96, 118),
  "vis-rl": companionPin(42, 116),
  "vis-supervised": companionPin(-198, -148),
  "vis-unsupervised": companionPin(-172, -112),
  "vis-semisupervised": companionPin(-218, -92),
  "vis-ensemble": companionPin(-152, -168),
  "vis-dt": companionPin(-188, -52),
  "vis-fe": companionPin(-228, -32),
  "vis-eval": companionPin(-162, -22),
  "vis-nn": companionPin(-92, -152),
  "vis-transformer": companionPin(-48, -128),
  "vis-imgcls": companionPin(175, -155),
  "vis-det": companionPin(168, -115),
  "vis-seg": companionPin(142, 82),
  "vis-3d": companionPin(148, -162),
  "vis-face": companionPin(188, -58),
  "vis-wordvec": companionPin(-218, 205),
  "vis-txtgen": companionPin(-142, 48),
  "vis-mt": companionPin(-292, 48),
  "vis-sent": companionPin(-98, 238),
  "vis-ner": companionPin(-302, 168),
  "vis-qa": companionPin(-122, 272),
  "vis-ql": companionPin(72, 182),
  "vis-pg": companionPin(58, 152),
  "vis-dqn": companionPin(88, 135),
  "vis-mcts": companionPin(68, 208),
  "vis-marl": companionPin(92, 168),
  "vis-svm": companionPin(-248, -72),
  "vis-knn": companionPin(-132, -42),
  "vis-gan": companionPin(-58, -168),
  "vis-ocr": companionPin(205, -88),
  "vis-summ": companionPin(-248, 138),
  "vis-chat": companionPin(-168, 248),
  "vis-bandit": companionPin(108, 228),
};

interface CompanionNodeSeed {
  id: string;
  title: string;
  intro: string;
  hubLevel?: 1 | 2;
}

const COMPANION_NODE_SEEDS: CompanionNodeSeed[] = [
  {
    id: "vis-ai",
    title: "人工智能",
    intro: "模拟人类智能的计算机系统",
    hubLevel: 2,
  },
  {
    id: "vis-ml",
    title: "机器学习",
    intro: "让系统从数据中学习",
    hubLevel: 1,
  },
  {
    id: "vis-cv",
    title: "计算机视觉",
    intro: "让计算机理解图像与视频",
    hubLevel: 1,
  },
  {
    id: "vis-nlp",
    title: "自然语言处理",
    intro: "让机器理解并生成人类语言",
    hubLevel: 1,
  },
  {
    id: "vis-rl",
    title: "强化学习",
    intro: "通过与环境交互学习最优策略",
    hubLevel: 1,
  },
  { id: "vis-supervised", title: "监督学习", intro: "有标签数据训练" },
  { id: "vis-unsupervised", title: "无监督学习", intro: "发现数据内在结构" },
  { id: "vis-semisupervised", title: "半监督学习", intro: "少量标签 + 大量无标签" },
  { id: "vis-ensemble", title: "集成学习", intro: "组合多个模型" },
  { id: "vis-dt", title: "决策树", intro: "树形规则划分" },
  { id: "vis-fe", title: "特征工程", intro: "构造有效输入特征" },
  { id: "vis-eval", title: "模型评估", intro: "度量泛化与偏差" },
  { id: "vis-nn", title: "神经网络", intro: "多层非线性变换" },
  { id: "vis-transformer", title: "Transformer", intro: "自注意力序列建模" },
  { id: "vis-imgcls", title: "图像分类", intro: "判定图像类别" },
  { id: "vis-det", title: "目标检测", intro: "定位并识别物体" },
  { id: "vis-seg", title: "图像分割", intro: "像素级区域划分" },
  { id: "vis-3d", title: "三维视觉", intro: "深度与点云理解" },
  { id: "vis-face", title: "人脸识别", intro: "身份特征匹配" },
  { id: "vis-wordvec", title: "词向量", intro: "分布式词表示" },
  { id: "vis-txtgen", title: "文本生成", intro: "续写与创作" },
  { id: "vis-mt", title: "机器翻译", intro: "跨语言转换" },
  { id: "vis-sent", title: "情感分析", intro: "极性与情绪识别" },
  { id: "vis-ner", title: "命名实体识别", intro: "抽取人名地名等" },
  { id: "vis-qa", title: "问答系统", intro: "检索或生成答案" },
  { id: "vis-ql", title: "Q学习", intro: "值函数迭代" },
  { id: "vis-pg", title: "策略梯度", intro: "直接优化策略" },
  { id: "vis-dqn", title: "深度Q网络", intro: "深度强化值学习" },
  { id: "vis-mcts", title: "蒙特卡洛树搜索", intro: "模拟 rollout 规划" },
  { id: "vis-marl", title: "多智能体学习", intro: "协作与博弈" },
  { id: "vis-svm", title: "支持向量机", intro: "最大间隔分类" },
  { id: "vis-knn", title: "K近邻", intro: "基于距离的分类" },
  { id: "vis-gan", title: "生成对抗网络", intro: "对抗式生成建模" },
  { id: "vis-ocr", title: "光学字符识别", intro: "图像转文本" },
  { id: "vis-summ", title: "文本摘要", intro: "长文压缩" },
  { id: "vis-chat", title: "对话系统", intro: "多轮交互" },
  { id: "vis-bandit", title: "多臂老虎机", intro: "探索与利用" },
];

const COMPANION_EDGE_SEEDS: Array<{
  source: string;
  target: string;
  relation: BrainGraphSnapshot["edges"][number]["relationType"];
  /** Fixture-only visual kind until domain gains temporal/emotional types. */
  visualKind?: VisualRelationKind;
}> = [
  { source: "vis-ai", target: "vis-ml", relation: "related" },
  { source: "vis-ai", target: "vis-cv", relation: "related" },
  { source: "vis-ai", target: "vis-nlp", relation: "related" },
  { source: "vis-ai", target: "vis-rl", relation: "related" },
  { source: "vis-ml", target: "vis-supervised", relation: "is_a" },
  { source: "vis-ml", target: "vis-unsupervised", relation: "is_a" },
  { source: "vis-ml", target: "vis-semisupervised", relation: "is_a" },
  { source: "vis-ml", target: "vis-ensemble", relation: "is_a" },
  { source: "vis-ml", target: "vis-dt", relation: "is_a" },
  { source: "vis-ml", target: "vis-fe", relation: "is_a" },
  { source: "vis-ml", target: "vis-eval", relation: "depends_on" },
  { source: "vis-ml", target: "vis-nn", relation: "depends_on" },
  { source: "vis-ml", target: "vis-transformer", relation: "depends_on" },
  { source: "vis-cv", target: "vis-imgcls", relation: "is_a" },
  { source: "vis-cv", target: "vis-det", relation: "is_a" },
  { source: "vis-cv", target: "vis-seg", relation: "is_a" },
  { source: "vis-cv", target: "vis-3d", relation: "related" },
  { source: "vis-cv", target: "vis-face", relation: "related" },
  { source: "vis-nlp", target: "vis-wordvec", relation: "depends_on" },
  { source: "vis-nlp", target: "vis-txtgen", relation: "is_a" },
  { source: "vis-nlp", target: "vis-mt", relation: "is_a" },
  { source: "vis-nlp", target: "vis-sent", relation: "related" },
  { source: "vis-nlp", target: "vis-ner", relation: "related" },
  { source: "vis-nlp", target: "vis-qa", relation: "depends_on" },
  { source: "vis-rl", target: "vis-ql", relation: "is_a" },
  { source: "vis-rl", target: "vis-pg", relation: "is_a" },
  { source: "vis-rl", target: "vis-dqn", relation: "depends_on" },
  { source: "vis-rl", target: "vis-mcts", relation: "related" },
  { source: "vis-rl", target: "vis-marl", relation: "related" },
  { source: "vis-supervised", target: "vis-unsupervised", relation: "related" },
  { source: "vis-fe", target: "vis-eval", relation: "depends_on" },
  { source: "vis-ensemble", target: "vis-supervised", relation: "depends_on" },
  { source: "vis-nn", target: "vis-transformer", relation: "depends_on" },
  { source: "vis-transformer", target: "vis-wordvec", relation: "related" },
  { source: "vis-transformer", target: "vis-nlp", relation: "related" },
  { source: "vis-nn", target: "vis-imgcls", relation: "related" },
  { source: "vis-transformer", target: "vis-txtgen", relation: "related" },
  { source: "vis-det", target: "vis-seg", relation: "related" },
  { source: "vis-mt", target: "vis-qa", relation: "depends_on" },
  { source: "vis-ql", target: "vis-dqn", relation: "depends_on" },
  { source: "vis-pg", target: "vis-ql", relation: "related" },
  { source: "vis-ai", target: "vis-transformer", relation: "related" },
  { source: "vis-ml", target: "vis-svm", relation: "is_a" },
  { source: "vis-ml", target: "vis-knn", relation: "is_a" },
  { source: "vis-nn", target: "vis-gan", relation: "related" },
  { source: "vis-cv", target: "vis-ocr", relation: "related" },
  { source: "vis-nlp", target: "vis-summ", relation: "is_a" },
  { source: "vis-nlp", target: "vis-chat", relation: "related" },
  { source: "vis-rl", target: "vis-bandit", relation: "related" },
  { source: "vis-supervised", target: "vis-svm", relation: "depends_on" },
  { source: "vis-unsupervised", target: "vis-knn", relation: "depends_on" },
  // related in domain; temporal/emotional colors for legend parity in captures
  { source: "vis-qa", target: "vis-summ", relation: "related", visualKind: "temporal" },
  { source: "vis-sent", target: "vis-chat", relation: "related", visualKind: "emotional" },
  { source: "vis-fe", target: "vis-nn", relation: "depends_on" },
  { source: "vis-imgcls", target: "vis-det", relation: "depends_on" },
  { source: "vis-wordvec", target: "vis-ner", relation: "related" },
  { source: "vis-ql", target: "vis-bandit", relation: "related" },
  // Upper-left ML cluster mesh — stays inside ignore rect for companion-main captures
  { source: "vis-supervised", target: "vis-dt", relation: "related" },
  { source: "vis-unsupervised", target: "vis-fe", relation: "related" },
  { source: "vis-nn", target: "vis-supervised", relation: "related" },
  { source: "vis-fe", target: "vis-eval", relation: "related" },
];

/** Companion capture: edge visual kinds keyed by sourceId:targetId. */
export const COMPANION_EDGE_VISUAL_OVERRIDES: Readonly<
  Record<string, VisualRelationKind>
> = Object.fromEntries(
  COMPANION_EDGE_SEEDS.filter(
    (edge): edge is (typeof COMPANION_EDGE_SEEDS)[number] & {
      visualKind: VisualRelationKind;
    } => edge.visualKind !== undefined,
  ).map((edge) => [`${edge.source}:${edge.target}`, edge.visualKind]),
);

/** Shorter hub subtitles for companion captures — avoids label/subtitle collisions. */
export const COMPANION_HUB_INTRO_SHORT: Record<string, string> = {
  "vis-ai": "模拟人类智能的计算机系统",
  "vis-ml": "从数据中学习",
  "vis-cv": "理解图像与视频",
  "vis-nlp": "理解与生成语言",
  "vis-rl": "交互中学习策略",
};

/** Stable cluster bucket per companion node (matches mockup color families). */
export const COMPANION_NODE_CLUSTER: Record<string, number> = {
  "vis-ai": 0,
  "vis-ml": 2,
  "vis-supervised": 2,
  "vis-unsupervised": 2,
  "vis-semisupervised": 2,
  "vis-ensemble": 2,
  "vis-dt": 2,
  "vis-fe": 2,
  "vis-eval": 2,
  "vis-nn": 2,
  "vis-transformer": 2,
  "vis-cv": 1,
  "vis-imgcls": 1,
  "vis-det": 1,
  "vis-seg": 1,
  "vis-3d": 1,
  "vis-face": 1,
  "vis-nlp": 3,
  "vis-wordvec": 3,
  "vis-txtgen": 3,
  "vis-mt": 3,
  "vis-sent": 3,
  "vis-ner": 3,
  "vis-qa": 3,
  "vis-rl": 0,
  "vis-ql": 0,
  "vis-pg": 0,
  "vis-dqn": 0,
  "vis-mcts": 0,
  "vis-marl": 0,
  "vis-svm": 2,
  "vis-knn": 2,
  "vis-gan": 2,
  "vis-ocr": 1,
  "vis-summ": 3,
  "vis-chat": 3,
  "vis-bandit": 0,
};

/** Dev-only dense hub-and-spoke graph for `?visual=companion` pixel baseline. */
export function createCompanionVisualGraphSnapshot(): BrainGraphSnapshot {
  const nodes = COMPANION_NODE_SEEDS.map((seed) => ({
    id: seed.id,
    title: seed.title,
    intro: seed.intro,
    sourceUrl: null,
    archived: false,
    createdAt: VISUAL_GRAPH_NOW,
    updatedAt: VISUAL_GRAPH_NOW,
    ...(seed.hubLevel !== undefined ? { hubLevel: seed.hubLevel } : {}),
  }));

  const edges = COMPANION_EDGE_SEEDS.filter(
    (edge) =>
      nodes.some((node) => node.id === edge.source) &&
      nodes.some((node) => node.id === edge.target),
  ).map((edge, index) => ({
    id: `vis-e${index + 1}`,
    sourceId: edge.source,
    targetId: edge.target,
    relationType: edge.relation,
  }));

  return { nodes, edges };
}

/** Dev-only sample conversation for the `?graphDemo` first screen. Display only. */
export const DEMO_VOICE_TRANSCRIPTS = [
  {
    id: "demo-user-1",
    role: "user" as const,
    text: "帮我理一下 RAG 和 AI Agent 的关系？",
    final: true,
  },
  {
    id: "demo-assistant-1",
    role: "assistant" as const,
    text: "RAG 给模型外接知识检索；AI Agent 更进一步，让模型调用工具、规划多步任务。两者底层都依赖 LLM。",
    final: true,
  },
  {
    id: "demo-user-2",
    role: "user" as const,
    text: "那 MCP 是做什么的？",
    final: true,
  },
  {
    id: "demo-assistant-2",
    role: "assistant" as const,
    text: "MCP 是让 Agent 统一接入外部工具与数据源的协议，配合 Tool Use 把能力做成可插拔的。要把它入库到你的大脑吗？",
    final: false,
  },
];

export const VISUAL_VOICE_TRANSCRIPT_TIMES = [
  "10:24:15",
  "10:24:18",
  "10:24:32",
  "10:24:35",
] as const;

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
    text: "深度学习是机器学习的一个分支，它使用多层神经网络模拟人脑处理信息的方式。通过大量数据训练，网络能自动学习特征表示。",
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
    text: "机器学习是更广泛的概念，而深度学习是其中的一个子集，专注于使用深层神经网络。",
    final: true,
  },
];
