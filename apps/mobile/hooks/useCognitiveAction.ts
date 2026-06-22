import { useCallback, useMemo, useState } from "react";

import {
  buildActionDraft,
  createConfirmationToken,
  requiresRemoteWrite,
  type ActionAuditEntry,
  type ActionConfirmation,
  type ActionDraft,
  type CognitiveActionType,
} from "@my-brain/core";

import { appendActionAuditEntry } from "../services/actionAuditStore";
import {
  executeRemoteAction,
  resolveExecutionAvailability,
  type ExecutionApiExecuteResult,
} from "../services/executionApiClient";
import {
  loadProviderSettings,
  type ExecutionApiConfig,
} from "../services/providerConfigStore";

export type CognitiveActionPhase = "idle" | "preview" | "confirm" | "executing" | "done" | "error";

export interface UseCognitiveActionResult {
  phase: CognitiveActionPhase;
  draft: ActionDraft | null;
  executionResult: ExecutionApiExecuteResult | null;
  executionConfig: ExecutionApiConfig;
  canRemoteExecute: boolean;
  remoteExecuteDisabledReason?: string;
  errorCode?: string;
  mockNotice?: string;
  liveNotice?: string;
  startDraft: (actionType: CognitiveActionType, context?: Parameters<typeof buildActionDraft>[1]) => void;
  saveDraftLocally: () => void;
  cancel: () => void;
  openConfirmation: () => void;
  confirmAndExecute: (confirmation: ActionConfirmation) => Promise<void>;
  retryExecute: () => Promise<void>;
}

function auditFromDraft(
  draft: ActionDraft,
  status: ActionAuditEntry["status"],
  extra?: Pick<ActionAuditEntry, "confirmedAt" | "errorCode" | "requestId">,
): ActionAuditEntry {
  return {
    actionId: draft.actionId,
    actionType: draft.actionType,
    createdAt: draft.createdAt,
    status,
    ...extra,
  };
}

export function useCognitiveAction(): UseCognitiveActionResult {
  const [phase, setPhase] = useState<CognitiveActionPhase>("idle");
  const [draft, setDraft] = useState<ActionDraft | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionApiExecuteResult | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [lastConfirmation, setLastConfirmation] = useState<ActionConfirmation | null>(null);

  const executionConfig = useMemo(() => loadProviderSettings().executionApi, []);
  const availability = useMemo(
    () => resolveExecutionAvailability(executionConfig),
    [executionConfig],
  );

  const startDraft = useCallback(
    (actionType: CognitiveActionType, context?: Parameters<typeof buildActionDraft>[1]) => {
      const next = buildActionDraft(actionType, context);
      setDraft(next);
      setExecutionResult(null);
      setErrorCode(undefined);
      setLastConfirmation(null);
      appendActionAuditEntry(auditFromDraft(next, "draft"));
      setPhase("preview");
    },
    [],
  );

  const saveDraftLocally = useCallback(() => {
    if (!draft) {
      return;
    }
    appendActionAuditEntry(auditFromDraft({ ...draft, status: "saved" }, "saved"));
    setPhase("done");
  }, [draft]);

  const cancel = useCallback(() => {
    if (draft) {
      appendActionAuditEntry(auditFromDraft(draft, "cancelled"));
    }
    setDraft(null);
    setExecutionResult(null);
    setErrorCode(undefined);
    setLastConfirmation(null);
    setPhase("idle");
  }, [draft]);

  const openConfirmation = useCallback(() => {
    if (!draft) {
      return;
    }
    if (!requiresRemoteWrite(draft.actionType)) {
      saveDraftLocally();
      return;
    }
    appendActionAuditEntry(auditFromDraft(draft, "pending_confirmation"));
    setPhase("confirm");
  }, [draft, saveDraftLocally]);

  const confirmAndExecute = useCallback(
    async (confirmation: ActionConfirmation) => {
      if (!draft) {
        return;
      }
      setLastConfirmation(confirmation);
      setPhase("executing");
      setErrorCode(undefined);
      try {
        const result = await executeRemoteAction(executionConfig, {
          actionType: draft.actionType,
          actionId: draft.actionId,
          confirmation,
        });
        setExecutionResult(result);
        appendActionAuditEntry(
          auditFromDraft(draft, "executed", {
            confirmedAt: confirmation.confirmedAt,
            requestId: result.requestId,
          }),
        );
        setPhase("done");
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code: string }).code)
            : "EXECUTION_FAILED";
        setErrorCode(code);
        appendActionAuditEntry(
          auditFromDraft(draft, "failed", {
            confirmedAt: confirmation.confirmedAt,
            errorCode: code,
          }),
        );
        setPhase("error");
      }
    },
    [draft, executionConfig],
  );

  const retryExecute = useCallback(async () => {
    if (!lastConfirmation) {
      return;
    }
    await confirmAndExecute(lastConfirmation);
  }, [confirmAndExecute, lastConfirmation]);

  return {
    phase,
    draft,
    executionResult,
    executionConfig,
    canRemoteExecute: availability.canExecute,
    remoteExecuteDisabledReason: availability.reason,
    errorCode,
    mockNotice: executionResult?.mode === "mock" ? executionResult.mockNotice : undefined,
    liveNotice: executionResult?.mode === "live" ? executionResult.liveNotice : undefined,
    startDraft,
    saveDraftLocally,
    cancel,
    openConfirmation,
    confirmAndExecute,
    retryExecute,
  };
}

export function createUserConfirmation(): ActionConfirmation {
  return {
    confirmationToken: createConfirmationToken(),
    confirmedAt: new Date().toISOString(),
  };
}
