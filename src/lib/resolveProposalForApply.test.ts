import { describe, expect, it } from "vitest";
import type { GraphMutationProposal } from "@/domain/graph";
import type { ProposalEnvelope } from "@/agent/types";
import { toResearchTempId } from "@/agent/jobs/topicResearchJob";
import {
  ProposalApplyOrderError,
  resolveProposalForApply,
} from "./resolveProposalForApply";

const runId = "run-resolve-test";

function envelope(
  proposal: GraphMutationProposal,
  id = proposal.id,
): ProposalEnvelope {
  return {
    id,
    runId,
    createdAt: "2026-06-01T00:00:00.000Z",
    source: "research_loop",
    status: "pending",
    proposal,
  };
}

describe("resolveProposalForApply", () => {
  const tempA = toResearchTempId("研究概念 A");
  const tempB = toResearchTempId("研究概念 B");

  const createA: GraphMutationProposal = {
    id: "prop-create-a",
    kind: "create",
    summary: "新建 A",
    payload: { title: "研究概念 A", intro: "a", sourceUrl: null },
  };

  const link: GraphMutationProposal = {
    id: "prop-link-ab",
    kind: "link",
    summary: "关联 A→B",
    payload: {
      sourceId: tempA,
      targetId: tempB,
      relationType: "related",
    },
  };

  it("blocks link approve while batch create is still pending", () => {
    expect(() =>
      resolveProposalForApply(link, {
        graph: { nodes: [], edges: [] },
        pending: [envelope(createA), envelope(link, "prop-link-ab")],
        runId,
        envelopeId: "prop-link-ab",
      }),
    ).toThrow(ProposalApplyOrderError);
  });

  it("resolves research temp ids after creates are in the graph", () => {
    const resolved = resolveProposalForApply(link, {
      graph: {
        nodes: [
          {
            id: "real-a",
            title: "研究概念 A",
            intro: "a",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "real-b",
            title: "研究概念 B",
            intro: "b",
            sourceUrl: null,
            archived: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        edges: [],
      },
      pending: [envelope(link, "prop-link-ab")],
      runId,
      envelopeId: "prop-link-ab",
    });

    expect(resolved.kind).toBe("link");
    if (resolved.kind === "link") {
      expect(resolved.payload).toMatchObject({
        sourceId: "real-a",
        targetId: "real-b",
        relationType: "related",
      });
    }
  });
});
