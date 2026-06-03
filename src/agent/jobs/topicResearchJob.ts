import type {
  BrainGraphSnapshot,
  GraphMutationProposal,
} from "@/domain/graph";
import { readCreatePayload, readLinkPayload } from "@/domain/graphMutationPayloads";
import type { NewsItem } from "@/domain/news";
import type { ConceptCandidate } from "@/providers/llm/types";
import {
  assertNotAborted,
  beginTraceStep,
  createAgentRunId,
  finishTraceStep,
} from "@/agent/runner";
import type {
  AgentDigest,
  AgentJob,
  AgentTraceStep,
  ProposalEnvelope,
} from "@/agent/types";
import { dedupeAgainstGraph } from "./dedupeNews";

export interface ResearchConfig {
  maxSteps: number;
  tokenBudgetPerRun: number;
  maxProposals: number;
}

export const DEFAULT_RESEARCH_CONFIG: ResearchConfig = {
  maxSteps: 8,
  tokenBudgetPerRun: 6000,
  maxProposals: 15,
};

/** Per-step token accounting when providers do not report usage (CI-stable budgets). */
export const TOPIC_RESEARCH_STEP_TOKENS = {
  plan: 120,
  gather: 40,
  synthesize: 280,
  propose: 80,
} as const;

/** Stable temp ids for intra-batch create → link resolution at approve time. */
export const RESEARCH_TEMP_PREFIX = "__research_temp:";

export function toResearchTempId(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, "-")
    .slice(0, 32);
  return `${RESEARCH_TEMP_PREFIX}${slug}__`;
}

export function isResearchTempId(id: string): boolean {
  return id.startsWith(RESEARCH_TEMP_PREFIX);
}

const PROPOSAL_KIND_ORDER: Record<GraphMutationProposal["kind"], number> = {
  create: 0,
  attach: 1,
  update: 2,
  merge: 3,
  link: 4,
  archive: 5,
};

/** Approve order: create before link so temp ids can be resolved. */
export function sortResearchProposalsForApprove(
  proposals: GraphMutationProposal[],
): GraphMutationProposal[] {
  return [...proposals].sort(
    (a, b) => PROPOSAL_KIND_ORDER[a.kind] - PROPOSAL_KIND_ORDER[b.kind],
  );
}

export function resolveResearchTempIdsInProposal(
  proposal: GraphMutationProposal,
  tempToReal: Map<string, string>,
): GraphMutationProposal {
  if (proposal.kind === "link") {
    const payload = readLinkPayload(proposal.payload);
    const sourceId = tempToReal.get(payload.sourceId) ?? payload.sourceId;
    const targetId = tempToReal.get(payload.targetId) ?? payload.targetId;
    if (sourceId === payload.sourceId && targetId === payload.targetId) {
      return proposal;
    }
    return {
      ...proposal,
      payload: { ...payload, sourceId, targetId },
    };
  }
  if (proposal.kind === "merge") {
    const sourceNodeId =
      tempToReal.get(String(proposal.payload.sourceNodeId ?? "")) ??
      String(proposal.payload.sourceNodeId ?? "");
    const targetNodeId =
      tempToReal.get(String(proposal.payload.targetNodeId ?? "")) ??
      String(proposal.payload.targetNodeId ?? "");
    if (
      sourceNodeId === proposal.payload.sourceNodeId &&
      targetNodeId === proposal.payload.targetNodeId
    ) {
      return proposal;
    }
    return {
      ...proposal,
      payload: {
        ...proposal.payload,
        sourceNodeId,
        targetNodeId,
      },
    };
  }
  return proposal;
}

function sumTraceTokens(trace: AgentTraceStep[]): number {
  return trace.reduce((total, step) => total + (step.tokensUsed ?? 0), 0);
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function findNodeByTitle(
  graph: BrainGraphSnapshot,
  title: string,
): { id: string; title: string } | undefined {
  const norm = normalizeTitle(title);
  return graph.nodes.find(
    (node) => !node.archived && normalizeTitle(node.title) === norm,
  );
}

/** Topic filter — keyword overlap on title/summary until dedicated search Provider lands. */
export function filterNewsByTopic(
  news: NewsItem[],
  topic: string,
  subQuestions: string[],
): NewsItem[] {
  const rawKeywords = [
    ...topic.split(/\s+/),
    ...subQuestions.flatMap((question) => question.split(/\s+/)),
  ]
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, "").trim())
    .filter((word) => word.length >= 2);

  const keywords = [...new Set(rawKeywords.map((word) => word.toLowerCase()))];
  if (keywords.length === 0) {
    return news;
  }

  return news.filter((item) => {
    const haystack = `${item.title} ${item.summary}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword));
  });
}

export function buildResearchProposalsFromCandidates(
  candidates: ConceptCandidate[],
  graph: BrainGraphSnapshot,
): GraphMutationProposal[] {
  const proposals: GraphMutationProposal[] = [];
  const titleToTempId = new Map<string, string>();

  for (const candidate of candidates) {
    const tempId = toResearchTempId(candidate.title);
    titleToTempId.set(normalizeTitle(candidate.title), tempId);
    proposals.push({
      id: `research-create-${tempId}`,
      kind: "create",
      summary: `研究链：新建「${candidate.title}」`,
      payload: {
        title: candidate.title,
        intro: candidate.intro,
        sourceUrl: candidate.sourceUrl,
      },
    });
  }

  const seenLinks = new Set<string>();

  for (const candidate of candidates) {
    const sourceTemp = titleToTempId.get(normalizeTitle(candidate.title));
    const existingSource = findNodeByTitle(graph, candidate.title);
    const sourceId = existingSource?.id ?? sourceTemp;
    if (!sourceId) {
      continue;
    }

    for (const rel of candidate.relations) {
      const existingTarget = findNodeByTitle(graph, rel.targetTitle);
      const batchTargetTemp = titleToTempId.get(normalizeTitle(rel.targetTitle));
      const targetId = existingTarget?.id ?? batchTargetTemp;
      if (!targetId) {
        continue;
      }

      const linkKey = `${sourceId}:${targetId}:${rel.relationType}`;
      if (seenLinks.has(linkKey)) {
        continue;
      }
      seenLinks.add(linkKey);

      proposals.push({
        id: `research-link-${linkKey}`,
        kind: "link",
        summary: `研究链：关联「${candidate.title}」→「${rel.targetTitle}」`,
        payload: {
          sourceId,
          targetId,
          relationType: rel.relationType,
        },
      });
    }
  }

  return proposals;
}

export function createTopicResearchJob(
  topic: string,
  config?: Partial<ResearchConfig>,
): AgentJob {
  const cfg: ResearchConfig = { ...DEFAULT_RESEARCH_CONFIG, ...config };
  const researchTopic = topic.trim() || "未命名主题";

  return {
    id: `topic-research:${researchTopic.slice(0, 40)}`,
    async run(tools, signal) {
      assertNotAborted(signal);

      const runId = createAgentRunId();
      const startedAt = new Date().toISOString();
      const trace: AgentTraceStep[] = [];
      const createdAt = new Date().toISOString();
      let stepsUsed = 0;

      const pushStep = (step: AgentTraceStep) => {
        trace.push(step);
      };

      const tokensUsed = () => sumTraceTokens(trace);
      const wouldExceedBudget = (nextCost: number) =>
        tokensUsed() + nextCost > cfg.tokenBudgetPerRun;

      const emptyResult = () => ({
        runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        proposals: [] as ProposalEnvelope[],
        digest: null as AgentDigest | null,
        trace,
      });

      const pushBudgetTruncated = (detail: string) => {
        pushStep(finishTraceStep(beginTraceStep("budget_truncated"), detail));
      };

      const pushStepLimit = (detail: string) => {
        pushStep(finishTraceStep(beginTraceStep("step_limit_truncated"), detail));
      };

      const consumeStep = (name: string, detail: string): boolean => {
        if (stepsUsed >= cfg.maxSteps) {
          pushStepLimit(`stopped before ${name}: ${detail}`);
          return false;
        }
        stepsUsed += 1;
        return true;
      };

      if (!consumeStep("plan", researchTopic)) {
        return emptyResult();
      }

      if (wouldExceedBudget(TOPIC_RESEARCH_STEP_TOKENS.plan)) {
        pushBudgetTruncated("stopped before plan");
        return emptyResult();
      }

      const profile = await tools.readProfile();
      assertNotAborted(signal);

      const planDraft = beginTraceStep("plan", researchTopic);
      const plan = await tools.planResearch(researchTopic, profile);
      pushStep(
        finishTraceStep(
          planDraft,
          `${plan.subQuestions.length} sub-questions`,
          TOPIC_RESEARCH_STEP_TOKENS.plan,
        ),
      );
      assertNotAborted(signal);

      if (!consumeStep("gather", researchTopic)) {
        return emptyResult();
      }

      if (wouldExceedBudget(TOPIC_RESEARCH_STEP_TOKENS.gather)) {
        pushBudgetTruncated("stopped before gather");
        return emptyResult();
      }

      const fetchDraft = beginTraceStep("gather");
      const fetched = await tools.fetchNews();
      const graph = await tools.readGraph();
      const deduped = dedupeAgainstGraph(fetched, graph);
      const topicFiltered = filterNewsByTopic(
        deduped,
        plan.topic,
        plan.subQuestions,
      );
      const relatedNodes = graph.nodes
        .filter((node) => !node.archived)
        .filter((node) => {
          const haystack = `${node.title} ${node.intro}`.toLowerCase();
          return haystack.includes(plan.topic.toLowerCase());
        });
      const evidence = [
        ...plan.subQuestions.map((question) => `Q: ${question}`),
        ...topicFiltered.map(
          (item) => `[${item.sourceName}] ${item.title}: ${item.summary}`,
        ),
        ...relatedNodes.map(
          (node) => `[graph] ${node.title}: ${node.intro.slice(0, 160)}`,
        ),
      ];
      pushStep(
        finishTraceStep(
          fetchDraft,
          `${evidence.length} evidence lines (${topicFiltered.length} news, ${relatedNodes.length} graph nodes)`,
          TOPIC_RESEARCH_STEP_TOKENS.gather,
        ),
      );
      assertNotAborted(signal);

      if (!consumeStep("synthesize", researchTopic)) {
        return emptyResult();
      }

      if (wouldExceedBudget(TOPIC_RESEARCH_STEP_TOKENS.synthesize)) {
        pushBudgetTruncated("stopped before synthesize");
        return emptyResult();
      }

      const synthesizeDraft = beginTraceStep("synthesize", researchTopic);
      const candidates = await tools.synthesizeConcepts(evidence);
      pushStep(
        finishTraceStep(
          synthesizeDraft,
          `${candidates.length} concept candidates`,
          TOPIC_RESEARCH_STEP_TOKENS.synthesize,
        ),
      );
      assertNotAborted(signal);

      if (!consumeStep("propose", researchTopic)) {
        return emptyResult();
      }

      if (wouldExceedBudget(TOPIC_RESEARCH_STEP_TOKENS.propose)) {
        pushBudgetTruncated("stopped before propose");
        return emptyResult();
      }

      const proposeDraft = beginTraceStep("propose", researchTopic);
      const rawProposals = buildResearchProposalsFromCandidates(
        candidates,
        graph,
      ).slice(0, cfg.maxProposals);
      pushStep(
        finishTraceStep(
          proposeDraft,
          `${rawProposals.length} proposals`,
          TOPIC_RESEARCH_STEP_TOKENS.propose,
        ),
      );
      assertNotAborted(signal);

      const proposals: ProposalEnvelope[] = rawProposals.map((proposal) => ({
        id: proposal.id,
        runId,
        createdAt,
        source: "research_loop",
        status: "pending",
        proposal,
      }));

      const digest: AgentDigest | null =
        candidates.length > 0 || plan.subQuestions.length > 0
          ? {
              title: `研究报告：${plan.topic}`,
              sections: [
                {
                  headline: "研究计划",
                  body: plan.subQuestions.join("\n"),
                },
                {
                  headline: "提炼概念",
                  body:
                    candidates.length > 0
                      ? candidates.map((c) => c.title).join("、")
                      : "（无可用证据，未提炼概念）",
                },
              ],
              generatedAt: createdAt,
            }
          : null;

      return {
        runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        proposals,
        digest,
        trace,
      };
    },
  };
}

/** Map temp create id → real node id after apply (for batch approve tests). */
export function mapTempIdAfterCreate(
  proposal: GraphMutationProposal,
  before: BrainGraphSnapshot,
  after: BrainGraphSnapshot,
  tempToReal: Map<string, string>,
): void {
  if (proposal.kind !== "create") {
    return;
  }
  const payload = readCreatePayload(proposal.payload);
  const tempId = toResearchTempId(payload.title);
  const created = after.nodes.find(
    (node) =>
      !before.nodes.some((prev) => prev.id === node.id) &&
      normalizeTitle(node.title) === normalizeTitle(payload.title),
  );
  if (created) {
    tempToReal.set(tempId, created.id);
  }
}
