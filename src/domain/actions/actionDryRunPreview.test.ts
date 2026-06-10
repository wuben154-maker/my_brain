import { describe, expect, it } from "vitest";
import { join } from "node:path";
import {
  executeControlledAction,
  previewControlledAction,
} from "@/agent/actionExecutor";

describe("actionDryRunPreview", () => {
  it("returns dry_run preview without executing write", async () => {
    const preview = previewControlledAction({
      id: "preview-1",
      permission: "external_write",
      summary: "create github issue",
    });
    expect(preview.status).toBe("dry_run");
    expect(preview.preview).toContain("external_write");
  });

  it("executeControlledAction dryRun does not write files", async () => {
    let wrote = false;
    const result = await executeControlledAction(
      {
        id: "preview-2",
        permission: "local_file_write",
        summary: "# draft",
        dryRun: true,
        targetPath: join(process.cwd(), ".my-brain", "drafts", "preview-2.md"),
      },
      {
        writeFile: async () => {
          wrote = true;
        },
      },
    );
    expect(result.status).toBe("dry_run");
    expect(wrote).toBe(false);
  });
});

describe("localWriteSandbox", () => {
  it("blocks local_file_write outside drafts sandbox", async () => {
    const draftsRoot = join(process.cwd(), ".my-brain", "drafts");
    const result = await executeControlledAction(
      {
        id: "sandbox-1",
        permission: "local_file_write",
        summary: "escape",
        targetPath: join(process.cwd(), "escape.md"),
      },
      { draftsRoot },
    );
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("sandbox_violation");
  });

  it("allows local_file_write inside drafts sandbox", async () => {
    const draftsRoot = join(process.cwd(), ".my-brain", "drafts");
    const targetPath = join(draftsRoot, "ok.md");
    let writtenPath = "";
    const result = await executeControlledAction(
      {
        id: "sandbox-2",
        permission: "local_file_write",
        summary: "safe draft",
        targetPath,
      },
      {
        draftsRoot,
        writeFile: async (path) => {
          writtenPath = path;
        },
      },
    );
    expect(result.status).toBe("executed");
    expect(writtenPath).toBe(targetPath);
  });
});
