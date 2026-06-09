import { describe, expect, it } from "vitest";
import { createCognitiveAction } from "@/actions/createCognitiveAction";
import {
  ActionDraftGuardError,
  assertActionDraftOnly,
  assertConfirmableDraft,
  assertUserConfirmedAction,
} from "@/actions/actionDraftGuard";
import type { CognitiveActionUserEvent } from "@/domain/actions/cognitiveAction";

const baseCitation = { type: "node" as const, id: "n-1", label: "A" };

describe("actionDraftGuard", () => {
  it("allows draft actions without user event", () => {
    const action = createCognitiveAction({
      id: "draft-1",
      kind: "weekly_review",
      title: "t",
      bodyMarkdown: "b",
      citations: [baseCitation],
    });
    expect(() => assertActionDraftOnly(action)).not.toThrow();
  });

  it("blocks confirmed status without user event", () => {
    const confirmed = {
      ...createCognitiveAction({
        id: "confirmed-1",
        kind: "weekly_review",
        title: "t",
        bodyMarkdown: "b",
        citations: [baseCitation],
      }),
      status: "confirmed" as const,
    };
    expect(() => assertActionDraftOnly(confirmed)).toThrow(ActionDraftGuardError);
  });

  it("allows confirmed when user event is present", () => {
    const confirmed = {
      ...createCognitiveAction({
        id: "confirmed-2",
        kind: "weekly_review",
        title: "t",
        bodyMarkdown: "b",
        citations: [baseCitation],
      }),
      status: "confirmed" as const,
    };
    const userEvent: CognitiveActionUserEvent = {
      kind: "user_confirm",
      at: "2026-06-01T00:00:00.000Z",
      source: "harness",
      actionId: "confirmed-2",
    };
    expect(() => assertActionDraftOnly(confirmed, { userEvent })).not.toThrow();
  });

  it("assertUserConfirmedAction rejects missing or wrong kind", () => {
    expect(() => assertUserConfirmedAction(undefined)).toThrow(/user_confirm/);
    expect(() =>
      assertUserConfirmedAction({
        kind: "user_confirm",
        at: "",
        source: "harness",
        actionId: "x",
      }),
    ).toThrow(/incomplete/);
  });

  it("createCognitiveAction cannot auto-confirm without user event", () => {
    expect(() =>
      createCognitiveAction({
        id: "auto-confirm",
        kind: "blog_draft",
        title: "t",
        bodyMarkdown: "b",
        citations: [baseCitation],
        status: "confirmed",
      }),
    ).toThrow(ActionDraftGuardError);
  });

  it("assertConfirmableDraft only accepts draft", () => {
    const draft = createCognitiveAction({
      id: "d",
      kind: "roadmap",
      title: "t",
      bodyMarkdown: "b",
      citations: [baseCitation],
    });
    expect(() => assertConfirmableDraft(draft)).not.toThrow();

    const dismissed = { ...draft, status: "dismissed" as const };
    expect(() => assertConfirmableDraft(dismissed)).toThrow(/not confirmable/);
  });
});
