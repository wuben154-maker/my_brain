/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GraphMutationProposal } from "@/domain/graph";
import { SuggestConfirmDialog } from "@/components/brain/SuggestConfirmDialog";

const sampleProposal: GraphMutationProposal = {
  id: "proposal-1",
  kind: "create",
  summary: "新建概念示例",
  payload: { title: "示例", intro: "简介", sourceUrl: null },
};

const secondProposal: GraphMutationProposal = {
  id: "proposal-2",
  kind: "link",
  summary: "建立关联示例",
  payload: { sourceId: "a", targetId: "b", relationType: "related" },
};

describe("SuggestConfirmDialog copy (M3)", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows single-step hint for one proposal", () => {
    render(
      createElement(SuggestConfirmDialog, {
        open: true,
        proposals: [sampleProposal],
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    expect(screen.getByText(/确认本条变更/)).toBeTruthy();
    expect(screen.queryByText(/共 \d+ 步变更/)).toBeNull();
  });

  it("shows multi-step hint only when more than one proposal", () => {
    render(
      createElement(SuggestConfirmDialog, {
        open: true,
        proposals: [sampleProposal, secondProposal],
        onConfirm: vi.fn(),
        onCancel: vi.fn(),
      }),
    );
    expect(screen.getByText("共 2 步变更，将按顺序执行")).toBeTruthy();
    expect(screen.queryByText(/确认本条变更/)).toBeNull();
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(screen.getByText("2/2")).toBeTruthy();
  });
});
