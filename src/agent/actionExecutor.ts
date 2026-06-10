import { join } from "node:path";
import type { ActionPermission } from "@/domain/actions/actionPermission";
import { DEFAULT_ACTION_POLICIES } from "@/domain/actions/actionPermission";
import {
  appendActionAuditEntry,
  type ActionAuditEntry,
} from "@/agent/actionAuditLog";

export type ActionExecutionStatus = "blocked" | "dry_run" | "executed" | "failed";

export interface ActionExecutionRequest {
  id: string;
  permission: ActionPermission;
  summary: string;
  targetPath?: string;
  userConfirmed?: boolean;
  dryRun?: boolean;
}

export interface ActionExecutionResult {
  status: ActionExecutionStatus;
  preview?: string;
  outputPath?: string;
  reason?: string;
  auditEntry?: ActionAuditEntry;
}

export interface ActionExecutorOptions {
  draftsRoot?: string;
  writeFile?: (path: string, contents: string) => Promise<void>;
  externalWrite?: (summary: string) => Promise<void>;
}

const DEFAULT_DRAFTS_DIR = join(process.cwd(), ".my-brain", "drafts");

function isPathInsideSandbox(targetPath: string, sandboxRoot: string): boolean {
  const normalizedRoot = sandboxRoot.replace(/\\/g, "/").replace(/\/+$/, "");
  const normalizedTarget = targetPath.replace(/\\/g, "/");
  return (
    normalizedTarget === normalizedRoot ||
    normalizedTarget.startsWith(`${normalizedRoot}/`)
  );
}

export async function executeControlledAction(
  request: ActionExecutionRequest,
  options: ActionExecutorOptions = {},
): Promise<ActionExecutionResult> {
  const policy = DEFAULT_ACTION_POLICIES[request.permission];
  const draftsRoot = options.draftsRoot ?? DEFAULT_DRAFTS_DIR;

  if (!policy.enabledByDefault && request.permission === "destructive_action") {
    const auditEntry = appendActionAuditEntry({
      actionId: request.id,
      permission: request.permission,
      summary: request.summary,
      result: "blocked",
      reason: "destructive_disabled",
    });
    return { status: "blocked", reason: "destructive_disabled", auditEntry };
  }

  if (request.dryRun) {
    const preview = `[dry-run] ${request.permission}: ${request.summary}`;
    return { status: "dry_run", preview };
  }

  if (policy.requiresUserConfirm && !request.userConfirmed) {
    const auditEntry = appendActionAuditEntry({
      actionId: request.id,
      permission: request.permission,
      summary: request.summary,
      result: "blocked",
      reason: "user_confirm_required",
    });
    return { status: "blocked", reason: "user_confirm_required", auditEntry };
  }

  if (request.permission === "local_file_write") {
    const targetPath = request.targetPath ?? join(draftsRoot, `${request.id}.md`);
    if (!isPathInsideSandbox(targetPath, draftsRoot)) {
      const auditEntry = appendActionAuditEntry({
        actionId: request.id,
        permission: request.permission,
        summary: request.summary,
        result: "blocked",
        reason: "sandbox_violation",
      });
      return { status: "blocked", reason: "sandbox_violation", auditEntry };
    }
    if (options.writeFile) {
      await options.writeFile(targetPath, request.summary);
    }
    const auditEntry = appendActionAuditEntry({
      actionId: request.id,
      permission: request.permission,
      summary: request.summary,
      result: "executed",
      outputPath: targetPath,
    });
    return { status: "executed", outputPath: targetPath, auditEntry };
  }

  if (request.permission === "external_write") {
    if (options.externalWrite) {
      await options.externalWrite(request.summary);
    }
    const auditEntry = appendActionAuditEntry({
      actionId: request.id,
      permission: request.permission,
      summary: request.summary,
      result: "executed",
    });
    return { status: "executed", auditEntry };
  }

  if (request.permission === "local_draft") {
    const auditEntry = appendActionAuditEntry({
      actionId: request.id,
      permission: request.permission,
      summary: request.summary,
      result: "executed",
    });
    return { status: "executed", auditEntry };
  }

  const auditEntry = appendActionAuditEntry({
    actionId: request.id,
    permission: request.permission,
    summary: request.summary,
    result: "blocked",
    reason: "unsupported_permission",
  });
  return { status: "blocked", reason: "unsupported_permission", auditEntry };
}

export function previewControlledAction(
  request: ActionExecutionRequest,
): ActionExecutionResult {
  return {
    status: "dry_run",
    preview: `[preview] ${request.permission}: ${request.summary}`,
  };
}
