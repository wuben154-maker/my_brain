import { describe, expect, it, vi } from "vitest";
import type { BrainGraphSnapshot } from "@/domain/graph";
import { readArchivePayload } from "@/domain/graphMutationPayloads";
import { readRepoSource } from "@/invariants/readRepoSource";
import { assertAgentToolsReadOnly, createAgentTools } from "@/agent/tools";
import { runAgentJob } from "@/agent/runner";
import { createMockLlmProvider } from "@/providers/llm/mockLlmProvider";
import { createNewsSourceRegistry } from "@/providers/news/types";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import {
  archiveProposalFromFinding,
  createCurationScanJob,
} from "./curationScanJob";

function createScanTools(graph: BrainGraphSnapshot) {
  const readGraph = vi.fn().mockResolvedValue(graph);
  const tools = createAgentTools({
    llm: createMockLlmProvider(),
    news: createNewsSourceRegistry([]),
    readGraph,
    readProfile: vi.fn().mockResolvedValue(DEFAULT_USER_PROFILE),
  });
  return { tools, readGraph };
}

describe("curationScanJob (C2)", () => {
  it("builds archive proposals with profile_suggestion source", () => {
    const proposal = archiveProposalFromFinding(
      {
        nodeId: "old",
        reason: "久未更新",
        migrateToNodeId: "new",
      },
      0,
    );
    const payload = readArchivePayload(proposal.payload);
    expect(proposal.kind).toBe("archive");
    expect(payload.nodeId).toBe("old");
    expect(payload.migrateEdgesToNodeId).toBe("new");
  });

  it("returns pending archive proposals without storage writes", async () => {
    const graph: BrainGraphSnapshot = {
      nodes: [
        {
          id: "legacy",
          title: "旧概念",
          intro: "i",
          sourceUrl: null,
          archived: false,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
      edges: [],
    };
    const { tools } = createScanTools(graph);
    const job = createCurationScanJob({ staleDays: 30, maxProposals: 3 });
    const result = await runAgentJob(job, tools, new AbortController().signal);

    expect(result.proposals.length).toBeGreaterThan(0);
    expect(result.proposals.every((p) => p.status === "pending")).toBe(true);
    expect(result.proposals.every((p) => p.source === "profile_suggestion")).toBe(
      true,
    );
    expect(result.proposals.every((p) => p.proposal.kind === "archive")).toBe(
      true,
    );
    assertAgentToolsReadOnly(tools);
  });

  it("returns empty proposals when graph has no stale candidates", async () => {
    const graph: BrainGraphSnapshot = {
      nodes: [
        {
          id: "fresh",
          title: "新概念",
          intro: "i",
          sourceUrl: null,
          archived: false,
          createdAt: "2026-05-30T00:00:00.000Z",
          updatedAt: "2026-05-30T00:00:00.000Z",
          salience: 1.5,
          lastTouchedAt: "2026-05-30T00:00:00.000Z",
        },
      ],
      edges: [],
    };
    const { tools } = createScanTools(graph);
    const job = createCurationScanJob({ staleDays: 90, maxProposals: 5 });
    const result = await runAgentJob(job, tools, new AbortController().signal);
    expect(result.proposals).toHaveLength(0);
  });

  it("does not call persistGraphSnapshot or saveConcept", () => {
    const source = readRepoSource("src/agent/jobs/curationScanJob.ts");
    expect(source).not.toContain("persistGraphSnapshot");
    expect(source).not.toContain("saveConcept");
  });
});
