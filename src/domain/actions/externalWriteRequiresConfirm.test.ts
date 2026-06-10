import { describe, expect, it, beforeEach } from "vitest";
import { executeControlledAction } from "@/agent/actionExecutor";
import { clearActionAuditLogForTests, findSuccessfulAudit } from "@/agent/actionAuditLog";

describe("externalWriteRequiresConfirm", () => {
  beforeEach(() => {
    clearActionAuditLogForTests();
  });

  it("blocks external_write without user confirmation", async () => {
    const result = await executeControlledAction({
      id: "ext-1",
      permission: "external_write",
      summary: "publish blog post",
      dryRun: false,
      userConfirmed: false,
    });
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("user_confirm_required");
    expect(findSuccessfulAudit("ext-1")).toBeUndefined();
  });

  it("allows external_write after dry-run preview and user confirm", async () => {
    const preview = await executeControlledAction({
      id: "ext-2",
      permission: "external_write",
      summary: "publish blog post",
      dryRun: true,
    });
    expect(preview.status).toBe("dry_run");

    const executed = await executeControlledAction(
      {
        id: "ext-2",
        permission: "external_write",
        summary: "publish blog post",
        userConfirmed: true,
        dryRun: false,
      },
      { externalWrite: async () => {} },
    );
    expect(executed.status).toBe("executed");
    expect(findSuccessfulAudit("ext-2")).toBeDefined();
  });
});
