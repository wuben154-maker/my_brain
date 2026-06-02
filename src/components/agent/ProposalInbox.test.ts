/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProposalEnvelope } from "@/agent/types";
import { ProposalInbox } from "@/components/agent/ProposalInbox";
import { useProposalInboxActions } from "@/hooks/useProposalInboxActions";
import { useProposalStore } from "@/stores/proposalStore";

vi.mock("@/hooks/useProposalInboxActions");

const envelope: ProposalEnvelope = {
  id: "prop-1",
  runId: "run-1",
  createdAt: "2026-06-02T08:00:00.000Z",
  source: "background_ingest",
  status: "pending",
  proposal: {
    id: "p1",
    kind: "create",
    summary: "新建概念「测试」",
    payload: { title: "测试", intro: "简介", sourceUrl: null },
  },
};

describe("ProposalInbox (A4)", () => {
  const approve = vi.fn(async () => undefined);
  const reject = vi.fn(async () => undefined);

  beforeEach(() => {
    vi.mocked(useProposalInboxActions).mockReturnValue({
      busyId: null,
      errorMessage: null,
      previewProposal: vi.fn(async () => undefined),
      clearPreview: vi.fn(),
      approve,
      reject,
    });
    useProposalStore.setState({ pending: [envelope] });
  });

  afterEach(() => {
    cleanup();
    useProposalStore.getState().reset();
    vi.clearAllMocks();
  });

  it("shows empty state when no pending proposals", () => {
    useProposalStore.setState({ pending: [] });
    render(
      createElement(ProposalInbox, {
        open: true,
        inline: true,
      }),
    );
    expect(screen.getByTestId("proposal-inbox-empty")).toBeTruthy();
  });

  it("calls approve when user clicks 同意", async () => {
    render(
      createElement(ProposalInbox, {
        open: true,
        inline: true,
      }),
    );

    screen.getByRole("button", { name: "同意" }).click();
    await vi.waitFor(() => {
      expect(approve).toHaveBeenCalledWith("prop-1");
    });
  });

  it("calls reject when user clicks 拒绝", async () => {
    render(
      createElement(ProposalInbox, {
        open: true,
        inline: true,
      }),
    );

    screen.getByRole("button", { name: "拒绝" }).click();
    await vi.waitFor(() => {
      expect(reject).toHaveBeenCalledWith("prop-1");
    });
  });
});
