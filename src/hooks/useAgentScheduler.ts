import { useEffect, useRef } from "react";
import type { AgentJob } from "@/agent/types";
import type { AgentScheduler } from "@/agent/scheduler";
import { createAgentScheduler } from "@/agent/scheduler";
import { persistAgentRunResult } from "@/agent/schedulerPersist";
import {
  loadSchedulerSettings,
  normalizeSchedulerSettings,
  saveSchedulerSettings,
  type StoredSchedulerSettings,
  DEFAULT_SCHEDULER_SETTINGS,
} from "@/agent/schedulerSettings";
import { setAgentSchedulerRuntime } from "@/agent/schedulerRuntime";
import { createAgentToolsFromProviders } from "@/agent/tools";
import { useAppStore } from "@/stores/appStore";

const V2_NOOP_JOB_ID = "v2-no-proposals";

const v2NoopJob: AgentJob = {
  id: V2_NOOP_JOB_ID,
  async run() {
    const now = new Date().toISOString();
    return {
      runId: `noop-${Date.now()}`,
      startedAt: now,
      finishedAt: now,
      proposals: [],
      digest: null,
      trace: [],
    };
  },
};

/** v2: proposal-producing jobs (A3/C2) stay disabled; scheduler is inert by default. */
export function useAgentScheduler(): void {
  const phase = useAppStore((state) => state.phase);
  const storage = useAppStore((state) => state.storage);
  const providers = useAppStore((state) => state.providers);

  const settingsRef = useRef<StoredSchedulerSettings>({
    ...DEFAULT_SCHEDULER_SETTINGS,
    enabled: false,
    jobId: V2_NOOP_JOB_ID,
  });
  const lastRunMsRef = useRef(0);
  const schedulerRef = useRef<AgentScheduler | null>(null);

  useEffect(() => {
    if (phase !== "companion") {
      return;
    }
    if (!storage || !providers) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const loaded = await loadSchedulerSettings(storage);
      if (cancelled) {
        return;
      }
      settingsRef.current = normalizeSchedulerSettings({
        ...loaded,
        enabled: false,
        jobId: V2_NOOP_JOB_ID,
      });
      lastRunMsRef.current = settingsRef.current.lastRunAt
        ? Date.parse(settingsRef.current.lastRunAt)
        : 0;

      const tools = createAgentToolsFromProviders(
        providers.llm,
        providers.news,
        storage,
      );
      const persist = async (
        result: Parameters<typeof persistAgentRunResult>[1],
      ) => {
        await persistAgentRunResult(storage, result);
      };

      const scheduler = createAgentScheduler({
        getJob: async () => v2NoopJob,
        tools,
        persist,
        getConfig: () => settingsRef.current,
        getLastRunAt: () => lastRunMsRef.current,
        setLastRunAt: (ms) => {
          lastRunMsRef.current = ms;
          settingsRef.current = {
            ...settingsRef.current,
            lastRunAt: new Date(ms).toISOString(),
          };
          void saveSchedulerSettings(storage, settingsRef.current);
        },
      });

      if (cancelled) {
        return;
      }

      schedulerRef.current = scheduler;
      scheduler.start();

      setAgentSchedulerRuntime({
        scheduler,
        getSettings: () => settingsRef.current,
        updateSettings: async (partial) => {
          settingsRef.current = normalizeSchedulerSettings({
            ...settingsRef.current,
            ...partial,
            enabled: false,
            jobId: V2_NOOP_JOB_ID,
          });
          await saveSchedulerSettings(storage, settingsRef.current);
          scheduler.stop();
          return settingsRef.current;
        },
      });
    })();

    return () => {
      cancelled = true;
      schedulerRef.current?.stop();
      schedulerRef.current = null;
      setAgentSchedulerRuntime(null);
    };
  }, [phase, storage, providers]);
}
