import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentJob, AgentRunResult } from "@/agent/types";
import {
  createAgentScheduler,
  SchedulerBusyError,
  type SchedulerConfig,
} from "./scheduler";

function makeResult(id: string): AgentRunResult {
  return {
    runId: `run-${id}`,
    startedAt: "2026-06-02T08:00:00.000Z",
    finishedAt: "2026-06-02T08:05:00.000Z",
    proposals: [],
    digest: null,
    trace: [],
  };
}

describe("createAgentScheduler (A5)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not trigger when enabled=false", async () => {
    const persist = vi.fn(async () => undefined);
    const run = vi.fn(async () => makeResult("1"));
    const config: SchedulerConfig = {
      enabled: false,
      intervalMs: 60_000,
      jobId: "morning-brief",
    };

    const scheduler = createAgentScheduler({
      getJob: () => ({ id: "morning-brief", run: run as AgentJob["run"] }),
      tools: {} as never,
      persist,
      getConfig: () => config,
      getLastRunAt: () => 0,
      setLastRunAt: () => undefined,
    });

    scheduler.start();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(run).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it("triggers on interval when enabled=true", async () => {
    const persist = vi.fn(async () => undefined);
    const run = vi.fn(async () => makeResult("2"));
    const config: SchedulerConfig = {
      enabled: true,
      intervalMs: 60_000,
      jobId: "morning-brief",
    };
    let lastRunAt = -config.intervalMs;

    const scheduler = createAgentScheduler({
      getJob: () => ({ id: "morning-brief", run: run as AgentJob["run"] }),
      tools: {} as never,
      persist,
      getConfig: () => config,
      getLastRunAt: () => lastRunAt,
      setLastRunAt: (ms) => {
        lastRunAt = ms;
      },
    });

    scheduler.start();
    await vi.waitFor(() => {
      expect(run).toHaveBeenCalledTimes(1);
    });
    await vi.advanceTimersByTimeAsync(120_000);
    await vi.waitFor(() => {
      expect(run).toHaveBeenCalledTimes(2);
    });
    expect(persist).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it("triggerNow runs immediately and persists", async () => {
    const result = makeResult("manual");
    const persist = vi.fn(async () => undefined);
    const run = vi.fn(async () => result);

    const scheduler = createAgentScheduler({
      getJob: () => ({ id: "morning-brief", run: run as AgentJob["run"] }),
      tools: {} as never,
      persist,
      getConfig: () => ({
        enabled: false,
        intervalMs: 60_000,
        jobId: "morning-brief",
      }),
      getLastRunAt: () => 0,
      setLastRunAt: vi.fn(),
    });

    const out = await scheduler.triggerNow();
    expect(out).toBe(result);
    expect(persist).toHaveBeenCalledWith(result);
  });

  it("rejects concurrent triggerNow while running", async () => {
    vi.useRealTimers();
    let resolveRun: (value: AgentRunResult) => void = () => undefined;
    const runPromise = new Promise<AgentRunResult>((resolve) => {
      resolveRun = resolve;
    });
    const run = vi.fn(() => runPromise);

    const scheduler = createAgentScheduler({
      getJob: () => ({ id: "morning-brief", run: run as AgentJob["run"] }),
      tools: {} as never,
      persist: vi.fn(async () => undefined),
      getConfig: () => ({
        enabled: false,
        intervalMs: 60_000,
        jobId: "morning-brief",
      }),
      getLastRunAt: () => 0,
      setLastRunAt: () => undefined,
    });

    const first = scheduler.triggerNow();
    await expect(scheduler.triggerNow()).rejects.toBeInstanceOf(
      SchedulerBusyError,
    );
    resolveRun(makeResult("done"));
    await first;
  });

  it("stop aborts an in-flight run", async () => {
    vi.useRealTimers();
    const run = vi.fn(
      (_tools, signal: AbortSignal) =>
        new Promise<AgentRunResult>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const scheduler = createAgentScheduler({
      getJob: () => ({ id: "morning-brief", run: run as AgentJob["run"] }),
      tools: {} as never,
      persist: vi.fn(async () => undefined),
      getConfig: () => ({
        enabled: false,
        intervalMs: 60_000,
        jobId: "morning-brief",
      }),
      getLastRunAt: () => 0,
      setLastRunAt: () => undefined,
    });

    const pending = scheduler.triggerNow().catch(() => null);
    await vi.waitFor(() => {
      expect(run).toHaveBeenCalled();
    });
    scheduler.stop();
    await pending;
  });

  it("persistAgentRunResult marks stale pending as expired", async () => {
    const { createTempStorage } = await import("@/invariants/testStorage");
    const { persistAgentRunResult, DEFAULT_PENDING_MAX_AGE_MS } = await import(
      "./schedulerPersist"
    );

    const { storage, cleanup } = createTempStorage();
    try {
      await storage.init();
      const oldCreated = new Date(
        Date.now() - DEFAULT_PENDING_MAX_AGE_MS - 60_000,
      ).toISOString();
      await storage.saveProposal({
        id: "stale-prop",
        runId: "run-old",
        createdAt: oldCreated,
        source: "background_ingest",
        status: "pending",
        proposal: {
          id: "stale-prop",
          kind: "create",
          summary: "旧提议",
          payload: { title: "旧", intro: "旧", sourceUrl: null },
        },
      });

      await persistAgentRunResult(storage, makeResult("persist"), 1000);

      const pending = await storage.listPendingProposals();
      expect(pending.some((p) => p.id === "stale-prop")).toBe(false);
    } finally {
      cleanup();
    }
  });
});
