import {
  assertExecutionAllowed,
  type ActionConfirmation,
  type CognitiveActionType,
} from "@my-brain/core";

import { validateProviderHttpsUrl } from "./providerUrlValidation";
import type { ExecutionApiConfig } from "./providerConfigStore";

export type ExecutionApiMode = "mock" | "live";

export interface ExecutionApiExecuteRequest {
  actionType: CognitiveActionType;
  actionId: string;
  confirmation: ActionConfirmation;
  payloadSummary?: string;
}

export interface ExecutionApiExecuteResult {
  id: string;
  mode: ExecutionApiMode;
  requestId: string;
  mockNotice: string;
  liveNotice?: string;
}

export type ExecutionApiErrorCode =
  | "CONFIRMATION_REQUIRED"
  | "BYPASS_HARD_STOP"
  | "INVALID_CONFIRMATION"
  | "EXECUTION_API_DISABLED"
  | "EXECUTION_API_CONFIG_ERROR"
  | "HTTPS_REQUIRED"
  | "BLOCKED_HOST"
  | "BLOCKED_SCHEME"
  | "INVALID_URL"
  | "NETWORK_ERROR";

export class ExecutionApiError extends Error {
  readonly code: ExecutionApiErrorCode;

  constructor(code: ExecutionApiErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ExecutionApiError";
    this.code = code;
  }
}

export interface ExecutionApiClientDeps {
  fetch?: typeof fetch;
  getBearerToken?: () => Promise<string | null>;
}

function requestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Mock adapter — UI must show mockNotice; never silent live execute. */
export function mockExecutionResult(actionId: string): ExecutionApiExecuteResult {
  return {
    id: `mock-${actionId.slice(-8)}`,
    mode: "mock",
    requestId: requestId(),
    mockNotice: "演示 — 未真正创建 issue 或发布内容",
  };
}

export function resolveExecutionAvailability(
  config: ExecutionApiConfig,
): { canExecute: boolean; reason?: string } {
  if (!config.enabled) {
    return { canExecute: false, reason: "Execution API 已关闭（默认）" };
  }
  if (!config.baseUrl.trim()) {
    return { canExecute: false, reason: "请先在连接与模型中配置 Execution API URL" };
  }
  const validation = validateProviderHttpsUrl(config.baseUrl);
  if (!validation.ok) {
    return { canExecute: false, reason: validation.hint ?? "Execution API URL 无效" };
  }
  return { canExecute: true };
}

/** Remote execute — HARD_STOP without confirmation; mock when no bearer token. */
export async function executeRemoteAction(
  config: ExecutionApiConfig,
  request: ExecutionApiExecuteRequest,
  deps: ExecutionApiClientDeps = {},
): Promise<ExecutionApiExecuteResult> {
  const gate = assertExecutionAllowed({
    confirmation: request.confirmation,
  });
  if (!gate.allowed) {
    throw new ExecutionApiError(
      (gate.errorCode ?? "CONFIRMATION_REQUIRED") as ExecutionApiErrorCode,
    );
  }

  const validation = validateProviderHttpsUrl(config.baseUrl);
  if (!validation.ok) {
    throw new ExecutionApiError(
      (validation.code ?? "EXECUTION_API_CONFIG_ERROR") as ExecutionApiErrorCode,
      validation.hint,
    );
  }

  if (!config.enabled) {
    throw new ExecutionApiError("EXECUTION_API_DISABLED", "Execution API 已关闭（默认）");
  }

  const bearer = deps.getBearerToken ? await deps.getBearerToken() : null;
  if (!bearer) {
    return mockExecutionResult(request.actionId);
  }

  const fetchFn = deps.fetch ?? fetch;
  const reqId = requestId();
  const url = `${config.baseUrl.replace(/\/$/, "")}/actions/execute`;

  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        "X-Request-Id": reqId,
      },
      body: JSON.stringify({
        actionType: request.actionType,
        actionId: request.actionId,
        confirmedAt: request.confirmation.confirmedAt,
        confirmationToken: request.confirmation.confirmationToken,
      }),
    });

    if (!response.ok) {
      throw new ExecutionApiError("NETWORK_ERROR", `HTTP ${response.status}`);
    }

    const body = (await response.json()) as { id?: string };
    return {
      id: body.id ?? reqId,
      mode: "live",
      requestId: reqId,
      mockNotice: "",
      liveNotice: "已提交至外部服务 — 请在外部平台确认是否创建成功",
    };
  } catch (error) {
    if (error instanceof ExecutionApiError) {
      throw error;
    }
    throw new ExecutionApiError("NETWORK_ERROR");
  }
}

/** Test-only bypass guard — mirrors production gate for audit tests. */
export function assertConfirmedBeforeFetch(
  confirmation: ActionConfirmation | null | undefined,
  bypassAttempt?: boolean,
): void {
  const gate = assertExecutionAllowed({ confirmation, bypassAttempt });
  if (!gate.allowed) {
    throw new ExecutionApiError(
      (gate.errorCode ?? "CONFIRMATION_REQUIRED") as ExecutionApiErrorCode,
    );
  }
}
