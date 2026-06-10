import type { ActionPermission } from "@/domain/actions/actionPermission";

export interface ActionAuditEntry {
  id: string;
  actionId: string;
  permission: ActionPermission;
  summary: string;
  result: "blocked" | "executed" | "failed";
  reason?: string;
  outputPath?: string;
  at: string;
}

const auditLog: ActionAuditEntry[] = [];

export function appendActionAuditEntry(
  input: Omit<ActionAuditEntry, "id" | "at"> & { at?: string },
): ActionAuditEntry {
  const entry: ActionAuditEntry = {
    id: `audit-${auditLog.length + 1}`,
    at: input.at ?? new Date().toISOString(),
    actionId: input.actionId,
    permission: input.permission,
    summary: input.summary,
    result: input.result,
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.outputPath ? { outputPath: input.outputPath } : {}),
  };
  auditLog.push(entry);
  return entry;
}

export function listActionAuditEntries(): ActionAuditEntry[] {
  return [...auditLog];
}

export function clearActionAuditLogForTests(): void {
  auditLog.length = 0;
}

export function findSuccessfulAudit(actionId: string): ActionAuditEntry | undefined {
  return auditLog.find(
    (entry) => entry.actionId === actionId && entry.result === "executed",
  );
}
