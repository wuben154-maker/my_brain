/** KP-15 — action permission tiers for controlled execution. */

export const ACTION_PERMISSIONS = [
  "local_draft",
  "local_file_write",
  "external_write",
  "destructive_action",
] as const;

export type ActionPermission = (typeof ACTION_PERMISSIONS)[number];

export interface ActionPermissionPolicy {
  permission: ActionPermission;
  /** Default enabled in MVP harness. */
  enabledByDefault: boolean;
  requiresUserConfirm: boolean;
  requiresDryRunPreview: boolean;
}

export const DEFAULT_ACTION_POLICIES: Record<ActionPermission, ActionPermissionPolicy> = {
  local_draft: {
    permission: "local_draft",
    enabledByDefault: true,
    requiresUserConfirm: false,
    requiresDryRunPreview: false,
  },
  local_file_write: {
    permission: "local_file_write",
    enabledByDefault: true,
    requiresUserConfirm: false,
    requiresDryRunPreview: false,
  },
  external_write: {
    permission: "external_write",
    enabledByDefault: false,
    requiresUserConfirm: true,
    requiresDryRunPreview: true,
  },
  destructive_action: {
    permission: "destructive_action",
    enabledByDefault: false,
    requiresUserConfirm: true,
    requiresDryRunPreview: true,
  },
};

export function isActionPermission(value: string): value is ActionPermission {
  return (ACTION_PERMISSIONS as readonly string[]).includes(value);
}
