import { describe, expect, it, beforeEach } from "vitest";
import { executeControlledAction } from "@/agent/actionExecutor";
import { clearActionAuditLogForTests } from "@/agent/actionAuditLog";

describe("destructiveActionBlocked", () => {
  beforeEach(() => {
    clearActionAuditLogForTests();
  });

  it("denies destructive_action by default even with user confirm", async () => {
    const result = await executeControlledAction({
      id: "dest-1",
      permission: "destructive_action",
      summary: "delete database",
      userConfirmed: true,
      dryRun: false,
    });
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("destructive_disabled");
  });
});
