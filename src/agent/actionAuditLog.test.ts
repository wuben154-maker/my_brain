import { describe, expect, it, beforeEach } from "vitest";
import { executeControlledAction } from "@/agent/actionExecutor";
import {
  appendActionAuditEntry,
  clearActionAuditLogForTests,
  listActionAuditEntries,
} from "@/agent/actionAuditLog";

describe("actionAuditLog", () => {
  beforeEach(() => {
    clearActionAuditLogForTests();
  });

  it("records who/when/what/result for executed local_draft", async () => {
    await executeControlledAction({
      id: "draft-1",
      permission: "local_draft",
      summary: "save weekly review draft",
    });
    const entries = listActionAuditEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.actionId).toBe("draft-1");
    expect(entries[0]?.result).toBe("executed");
    expect(entries[0]?.at).toBeTruthy();
  });

  it("appendActionAuditEntry stores blocked attempts", () => {
    appendActionAuditEntry({
      actionId: "blocked-1",
      permission: "external_write",
      summary: "no confirm",
      result: "blocked",
      reason: "user_confirm_required",
    });
    expect(listActionAuditEntries()[0]?.reason).toBe("user_confirm_required");
  });
});
