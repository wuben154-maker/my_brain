import { describe, expect, it } from "vitest";

import {
  assertExecutionAllowed,
  createConfirmationToken,
  permissionLevelForAction,
  requiresRemoteWrite,
} from "./executionGate.js";

describe("executionGate", () => {
  it("rejects execute without confirmationToken and confirmedAt", () => {
    expect(assertExecutionAllowed({}).allowed).toBe(false);
    expect(assertExecutionAllowed({}).errorCode).toBe("CONFIRMATION_REQUIRED");

    expect(
      assertExecutionAllowed({
        confirmation: { confirmationToken: "", confirmedAt: "" },
      }).allowed,
    ).toBe(false);
  });

  it("allows execute with valid confirmation", () => {
    const result = assertExecutionAllowed({
      confirmation: {
        confirmationToken: createConfirmationToken(),
        confirmedAt: new Date().toISOString(),
      },
    });
    expect(result.allowed).toBe(true);
    expect(result.hardStop).toBeUndefined();
  });

  it("HARD_STOP on bypass attempt", () => {
    const result = assertExecutionAllowed({
      bypassAttempt: true,
      confirmation: {
        confirmationToken: createConfirmationToken(),
        confirmedAt: new Date().toISOString(),
      },
    });
    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe("BYPASS_HARD_STOP");
    expect(result.hardStop).toBe(true);
  });

  it("rejects invalid confirmation token", () => {
    const result = assertExecutionAllowed({
      confirmation: {
        confirmationToken: "short",
        confirmedAt: new Date().toISOString(),
      },
    });
    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe("INVALID_CONFIRMATION");
  });

  it("maps remote-write action types to user-confirmed-write", () => {
    expect(requiresRemoteWrite("draft_github_issue")).toBe(true);
    expect(requiresRemoteWrite("draft_blog_post")).toBe(true);
    expect(requiresRemoteWrite("draft_roadmap")).toBe(false);
    expect(permissionLevelForAction("draft_github_issue")).toBe("user-confirmed-write");
    expect(permissionLevelForAction("draft_weekly_review")).toBe("suggest");
  });
});
