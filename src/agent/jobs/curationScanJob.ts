import type { GraphMutationProposal } from "@/domain/graph";
import { detectStaleNodes } from "@/agent/curation/detectStale";
import {
  assertNotAborted,
  beginTraceStep,
  createAgentRunId,
  finishTraceStep,
} from "@/agent/runner";
import type { AgentJob, AgentTraceStep, ProposalEnvelope } from "@/agent/types";

export interface CurationScanConfig {
  staleDays: number;
  maxProposals: number;
}

export const DEFAULT_CURATION_SCAN_CONFIG: CurationScanConfig = {
  staleDays: 90,
  maxProposals: 5,
};

export function archiveProposalFromFinding(
  finding: { nodeId: string; reason: string; migrateToNodeId?: string },
  index: number,
): GraphMutationProposal {
  return {
    id: `curation-archive-${finding.nodeId}-${index}`,
    kind: "archive",
    summary: `建议归档：${finding.reason}`,
    payload: {
      nodeId: finding.nodeId,
      ...(finding.migrateToNodeId
        ? { migrateEdgesToNodeId: finding.migrateToNodeId }
        : {}),
    },
  };
}

export function createCurationScanJob(
  config?: Partial<CurationScanConfig>,
): AgentJob {
  const cfg: CurationScanConfig = {
    ...DEFAULT_CURATION_SCAN_CONFIG,
    ...config,
  };

  return {
    id: "curation-scan",
    async run(tools, signal) {
      assertNotAborted(signal);

      const runId = createAgentRunId();
      const startedAt = new Date().toISOString();
      const trace: AgentTraceStep[] = [];
      const pushStep = (step: AgentTraceStep) => {
        trace.push(step);
      };

      const scanStep = beginTraceStep("scan_stale");
      const graph = await tools.readGraph();
      const findings = detectStaleNodes(graph, new Date(), cfg.staleDays);
      pushStep(
        finishTraceStep(
          scanStep,
          `${findings.length} stale candidates`,
          40,
        ),
      );

      const proposals: ProposalEnvelope[] = findings
        .slice(0, cfg.maxProposals)
        .map((finding, index) => {
          const proposal = archiveProposalFromFinding(finding, index);
          return {
            id: proposal.id,
            runId,
            createdAt: new Date().toISOString(),
            source: "profile_suggestion" as const,
            status: "pending" as const,
            proposal,
          };
        });

      const proposeStep = beginTraceStep("propose_archive");
      pushStep(
        finishTraceStep(
          proposeStep,
          `${proposals.length} archive proposals`,
          20,
        ),
      );

      return {
        runId,
        startedAt,
        finishedAt: new Date().toISOString(),
        proposals,
        digest: null,
        trace,
      };
    },
  };
}
