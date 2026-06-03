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
import type { TokenBudget } from "@/agent/budget";
import { selectTopNewsByProfile } from "@/agent/curation/scoreNews";
import { dedupeAgainstGraph } from "./dedupeNews";

export interface MorningBriefConfig {
  topN: number;
  tokenBudgetPerRun: number;
  maxProposals: number;
  /** H1 hard guardrail; when set, charges persist via storage-backed daily cap. */
  budget?: TokenBudget;
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

export { sortNewsForBrief } from "@/agent/curation/scoreNews";

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
      const budget = cfg.budget;

      const emptyResult = () => ({
        runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        proposals: [] as ProposalEnvelope[],
        digest: null as AgentDigest | null,
        trace,
      });

      const pushBudgetTruncated = (detail: string) => {
        pushStep(
          finishTraceStep(beginTraceStep("budget_truncated"), detail),
        );
      };

      const cannotAfford = (nextCost: number) => {
        if (budget) {
          return (
            budget.isDayCapReached() || budget.remaining() < nextCost
          );
        }
        return wouldExceedBudget(nextCost);
      };

      const chargeStep = (cost: number, truncateDetail: string): boolean => {
        if (!budget) {
          return true;
        }
        try {
          budget.charge(cost);
          return true;
        } catch {
          pushBudgetTruncated(truncateDetail);
          return false;
        }
      };

      if (budget?.isDayCapReached()) {
        pushStep(
          finishTraceStep(
            beginTraceStep("budget_day_cap"),
            "daily token cap reached",
          ),
        );
        return emptyResult();
      }

      const fetchDraft = beginTraceStep("fetchNews");
      const fetched = await tools.fetchNews();
      pushStep(finishTraceStep(fetchDraft, `${fetched.length} items`));
      assertNotAborted(signal);

      const graphDraft = beginTraceStep("readGraph");
      const graph = await tools.readGraph();
      pushStep(finishTraceStep(graphDraft, `${graph.nodes.length} nodes`));
      assertNotAborted(signal);

      const profileDraft = beginTraceStep("readProfile");
      const profile = await tools.readProfile();
      pushStep(finishTraceStep(profileDraft, profile.displayName ?? "default"));

      const dedupeDraft = beginTraceStep("dedupeAgainstGraph");
      const deduped = dedupeAgainstGraph(fetched, graph);
      pushStep(
        finishTraceStep(
          dedupeDraft,
          `${deduped.length} items after dedupe (${fetched.length} fetched)`,
        ),
      );
      assertNotAborted(signal);

      const candidates = selectTopNewsByProfile(deduped, profile, cfg.topN);
      const sections: AgentDigestSection[] = [];
      const proposals: ProposalEnvelope[] = [];

      for (const item of candidates) {
        assertNotAborted(signal);

        if (proposals.length >= cfg.maxProposals) {
          break;
        }

        if (cannotAfford(MORNING_BRIEF_STEP_TOKENS.summarize)) {
          pushBudgetTruncated(`stopped before summarize: ${item.title}`);
          break;
        }

        const summarizeDraft = beginTraceStep("summarize", item.title);
        const summary = await tools.summarize(item, profile);
        pushStep(
          finishTraceStep(
            summarizeDraft,
            summary.slice(0, 80),
            MORNING_BRIEF_STEP_TOKENS.summarize,
          ),
        );
        if (
          !chargeStep(
            MORNING_BRIEF_STEP_TOKENS.summarize,
            `budget after summarize: ${item.title}`,
          )
        ) {
          break;
        }
        assertNotAborted(signal);

        sections.push({ headline: item.title, body: summary });

        if (cannotAfford(MORNING_BRIEF_STEP_TOKENS.propose)) {
          pushBudgetTruncated(`stopped before propose: ${item.title}`);
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
        if (
          !chargeStep(
            MORNING_BRIEF_STEP_TOKENS.propose,
            `budget after propose: ${item.title}`,
          )
        ) {
          break;
        }
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
