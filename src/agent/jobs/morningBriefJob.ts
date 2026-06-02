import type { NewsItem } from "@/domain/news";
import {
  assertNotAborted,
  beginTraceStep,
  createAgentRunId,
  finishTraceStep,
} from "@/agent/runner";
import type {
  AgentDigest,
  AgentDigestSection,
  AgentJob,
  AgentTraceStep,
  ProposalEnvelope,
} from "@/agent/types";
import { dedupeAgainstGraph } from "./dedupeNews";

export interface MorningBriefConfig {
  topN: number;
  tokenBudgetPerRun: number;
  maxProposals: number;
}

export const DEFAULT_MORNING_BRIEF_CONFIG: MorningBriefConfig = {
  topN: 5,
  tokenBudgetPerRun: 8000,
  maxProposals: 10,
};

/** Per-step token accounting when providers do not report usage (CI-stable budgets). */
export const MORNING_BRIEF_STEP_TOKENS = {
  summarize: 100,
  propose: 200,
} as const;

/** Simple recency sort until C1 profile scoring lands. */
export function sortNewsForBrief(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    if (bTime !== aTime) {
      return bTime - aTime;
    }
    return a.sourceName.localeCompare(b.sourceName, "zh-CN");
  });
}

function sumTraceTokens(trace: AgentTraceStep[]): number {
  return trace.reduce((total, step) => total + (step.tokensUsed ?? 0), 0);
}

export function createMorningBriefJob(
  config?: Partial<MorningBriefConfig>,
): AgentJob {
  const cfg: MorningBriefConfig = {
    ...DEFAULT_MORNING_BRIEF_CONFIG,
    ...config,
  };

  return {
    id: "morning-brief",
    async run(tools, signal) {
      assertNotAborted(signal);

      const runId = createAgentRunId();
      const startedAt = new Date().toISOString();
      const trace: AgentTraceStep[] = [];
      const createdAt = new Date().toISOString();

      const pushStep = (step: AgentTraceStep) => {
        trace.push(step);
      };

      const tokensUsed = () => sumTraceTokens(trace);
      const wouldExceedBudget = (nextCost: number) =>
        tokensUsed() + nextCost > cfg.tokenBudgetPerRun;

      const fetchDraft = beginTraceStep("fetchNews");
      const fetched = await tools.fetchNews();
      pushStep(finishTraceStep(fetchDraft, `${fetched.length} items`));
      assertNotAborted(signal);

      const graphDraft = beginTraceStep("readGraph");
      const graph = await tools.readGraph();
      pushStep(finishTraceStep(graphDraft, `${graph.nodes.length} nodes`));
      assertNotAborted(signal);

      await tools.readProfile();

      const dedupeDraft = beginTraceStep("dedupeAgainstGraph");
      const deduped = dedupeAgainstGraph(fetched, graph);
      pushStep(
        finishTraceStep(
          dedupeDraft,
          `${deduped.length} items after dedupe (${fetched.length} fetched)`,
        ),
      );
      assertNotAborted(signal);

      const candidates = sortNewsForBrief(deduped).slice(0, cfg.topN);
      const sections: AgentDigestSection[] = [];
      const proposals: ProposalEnvelope[] = [];

      for (const item of candidates) {
        assertNotAborted(signal);

        if (proposals.length >= cfg.maxProposals) {
          break;
        }

        if (wouldExceedBudget(MORNING_BRIEF_STEP_TOKENS.summarize)) {
          pushStep(
            finishTraceStep(
              beginTraceStep("budget_truncated"),
              `stopped before summarize: ${item.title}`,
            ),
          );
          break;
        }

        const summarizeDraft = beginTraceStep("summarize", item.title);
        const summary = await tools.summarize(item);
        pushStep(
          finishTraceStep(
            summarizeDraft,
            summary.slice(0, 80),
            MORNING_BRIEF_STEP_TOKENS.summarize,
          ),
        );
        assertNotAborted(signal);

        sections.push({ headline: item.title, body: summary });

        if (wouldExceedBudget(MORNING_BRIEF_STEP_TOKENS.propose)) {
          pushStep(
            finishTraceStep(
              beginTraceStep("budget_truncated"),
              `stopped before propose: ${item.title}`,
            ),
          );
          break;
        }

        const proposeDraft = beginTraceStep("propose", item.title);
        const context = JSON.stringify({
          newsItem: item,
          nodes: graph.nodes.map((node) => ({
            id: node.id,
            title: node.title,
            intro: node.intro,
          })),
        });
        const mutations = await tools.propose(context);
        pushStep(
          finishTraceStep(
            proposeDraft,
            `${mutations.length} proposals`,
            MORNING_BRIEF_STEP_TOKENS.propose,
          ),
        );
        assertNotAborted(signal);

        const remaining = cfg.maxProposals - proposals.length;
        for (const proposal of mutations.slice(0, remaining)) {
          proposals.push({
            id: proposal.id,
            runId,
            createdAt,
            source: "background_ingest",
            status: "pending",
            proposal,
          });
        }

        if (proposals.length >= cfg.maxProposals) {
          break;
        }
      }

      const digest: AgentDigest | null =
        sections.length > 0
          ? {
              title: "晨间简报",
              sections,
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
