import { describe, expect, it, vi } from "vitest";

import {
  assertConfirmedBeforeFetch,
  ExecutionApiError,
  executeRemoteAction,
  mockExecutionResult,
  resolveExecutionAvailability,
} from "./executionApiClient";
import { DEFAULT_PROVIDER_SETTINGS } from "./providerConfigStore";

describe("executionApiClient", () => {
  it("mock adapter returns mode mock with visible notice", () => {
    const result = mockExecutionResult("action-123");
    expect(result.mode).toBe("mock");
    expect(result.mockNotice).toContain("演示");
    expect(result.mockNotice).toContain("未真正创建");
  });

  it("rejects unconfirmed execute", async () => {
    await expect(
      executeRemoteAction(DEFAULT_PROVIDER_SETTINGS.executionApi, {
        actionType: "draft_github_issue",
        actionId: "action-1",
        confirmation: { confirmationToken: "short", confirmedAt: new Date().toISOString() },
      }),
    ).rejects.toMatchObject({ code: "INVALID_CONFIRMATION" });
  });

  it("rejects bypass attempt via assertConfirmedBeforeFetch", () => {
    expect(() =>
      assertConfirmedBeforeFetch(
        {
          confirmationToken: "confirm-token-12345678",
          confirmedAt: new Date().toISOString(),
        },
        true,
      ),
    ).toThrow(ExecutionApiError);
  });

  it("disabled execution API blocks remote execute even with confirmation", async () => {
    await expect(
      executeRemoteAction(
        { baseUrl: "https://api.example.com/exec", enabled: false },
        {
          actionType: "draft_github_issue",
          actionId: "action-2",
          confirmation: {
            confirmationToken: "confirm-token-12345678",
            confirmedAt: new Date().toISOString(),
          },
        },
      ),
    ).rejects.toMatchObject({ code: "EXECUTION_API_DISABLED" });
  });

  it("SSRF blocked URL rejected before fetch", async () => {
    await expect(
      executeRemoteAction(
        { baseUrl: "https://localhost/exec", enabled: true },
        {
          actionType: "draft_github_issue",
          actionId: "action-3",
          confirmation: {
            confirmationToken: "confirm-token-12345678",
            confirmedAt: new Date().toISOString(),
          },
        },
      ),
    ).rejects.toMatchObject({ code: "BLOCKED_HOST" });
  });

  it("uses mock when bearer missing — no silent live fetch", async () => {
    const fetchSpy = vi.fn();
    const result = await executeRemoteAction(
      { baseUrl: "https://api.example.com/exec", enabled: true },
      {
        actionType: "draft_github_issue",
        actionId: "action-4",
        confirmation: {
          confirmationToken: "confirm-token-12345678",
          confirmedAt: new Date().toISOString(),
        },
      },
      { fetch: fetchSpy, getBearerToken: async () => null },
    );
    expect(result.mode).toBe("mock");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("live execute returns explicit external-write notice", async () => {
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: "remote-action-1" }),
    })) as typeof fetch;

    const result = await executeRemoteAction(
      { baseUrl: "https://api.example.com/exec", enabled: true },
      {
        actionType: "draft_github_issue",
        actionId: "action-live",
        confirmation: {
          confirmationToken: "confirm-token-12345678",
          confirmedAt: new Date().toISOString(),
        },
      },
      { fetch: fetchSpy, getBearerToken: async () => "bearer-token" },
    );

    expect(result.mode).toBe("live");
    expect(result.liveNotice).toContain("外部服务");
    expect(result.mockNotice).toBe("");
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("resolveExecutionAvailability explains disabled state", () => {
    expect(resolveExecutionAvailability(DEFAULT_PROVIDER_SETTINGS.executionApi).canExecute).toBe(
      false,
    );
  });
});
