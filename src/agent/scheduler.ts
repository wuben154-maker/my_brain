import { runAgentJob } from "./runner";
import type { AgentJob, AgentRunResult, AgentTools } from "./types";

export interface SchedulerConfig {
  enabled: boolean;
  intervalMs: number;
  jobId: string;
}

export interface AgentScheduler {
  start(): void;
  stop(): void;
  triggerNow(): Promise<AgentRunResult>;
  onRun(listener: (result: AgentRunResult) => void): () => void;
  isRunning(): boolean;
}

export class SchedulerBusyError extends Error {
  constructor(message = "Agent scheduler is already running a job") {
    super(message);
    this.name = "SchedulerBusyError";
  }
}

const TICK_MS = 60_000;

export function createAgentScheduler(deps: {
  /** Resolved per run so H1 budgets reload daily usage each trigger. */
  getJob: () => AgentJob | Promise<AgentJob>;
  tools: AgentTools;
  persist: (result: AgentRunResult) => Promise<void>;
  getConfig: () => SchedulerConfig;
  getLastRunAt: () => number;
  setLastRunAt: (ms: number) => void;
}): AgentScheduler {
  let running = false;
  let abortController: AbortController | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<(result: AgentRunResult) => void>();

  const notify = (result: AgentRunResult) => {
    for (const listener of listeners) {
      listener(result);
    }
  };

  const executeRun = async (): Promise<AgentRunResult> => {
    if (running) {
      throw new SchedulerBusyError();
    }
    running = true;
    abortController = new AbortController();
    try {
      const job = await Promise.resolve(deps.getJob());
      if (job.id !== deps.getConfig().jobId) {
        throw new Error(
          `Scheduler job mismatch: expected ${deps.getConfig().jobId}, got ${job.id}`,
        );
      }

      const result = await runAgentJob(
        job,
        deps.tools,
        abortController.signal,
      );
      await deps.persist(result);
      const finishedAt = Date.now();
      deps.setLastRunAt(finishedAt);
      notify(result);
      return result;
    } finally {
      running = false;
      abortController = null;
    }
  };

  const maybeRunInterval = () => {
    const config = deps.getConfig();
    if (!config.enabled || running) {
      return;
    }
    const elapsed = Date.now() - deps.getLastRunAt();
    if (elapsed >= config.intervalMs) {
      void executeRun().catch(() => {
        // Interval failures are non-fatal; next tick may retry.
      });
    }
  };

  return {
    start() {
      if (timer) {
        clearInterval(timer);
      }
      timer = setInterval(maybeRunInterval, TICK_MS);
      maybeRunInterval();
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      abortController?.abort();
    },
    triggerNow() {
      return executeRun();
    },
    onRun(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isRunning() {
      return running;
    },
  };
}
