import { useEffect, useRef } from "react";
import { createMorningBriefBudget } from "@/agent/budget";
import { createMorningBriefJob } from "@/agent/jobs/morningBriefJob";
import type { AgentScheduler } from "@/agent/scheduler";
import { createAgentScheduler } from "@/agent/scheduler";
import { persistAgentRunResult } from "@/agent/schedulerPersist";
import {
  loadSchedulerSettings,
  saveSchedulerSettings,
  type StoredSchedulerSettings,
  DEFAULT_SCHEDULER_SETTINGS,
} from "@/agent/schedulerSettings";
import { setAgentSchedulerRuntime } from "@/agent/schedulerRuntime";
import { createAgentToolsFromProviders } from "@/agent/tools";
import { useAppStore } from "@/stores/appStore";
import { useProposalStore } from "@/stores/proposalStore";

/** L1 local scheduler — morning brief → inbox (A5). */
export function useAgentScheduler(): void {
  const phase = useAppStore((state) => state.phase);
  const storage = useAppStore((state) => state.storage);
  const providers = useAppStore((state) => state.providers);

  const settingsRef = useRef<StoredSchedulerSettings>({
    ...DEFAULT_SCHEDULER_SETTINGS,
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
      settingsRef.current = loaded;
      lastRunMsRef.current = loaded.lastRunAt
        ? Date.parse(loaded.lastRunAt)
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
        await useProposalStore.getState().load(storage);
      };

      const scheduler = createAgentScheduler({
        getJob: async () => {
          const budget = await createMorningBriefBudget(storage);
          return createMorningBriefJob({ budget });
        },
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

      scheduler.onRun(() => {
        void useProposalStore.getState().load(storage);
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
          settingsRef.current = {
            ...settingsRef.current,
            ...partial,
          };
          await saveSchedulerSettings(storage, settingsRef.current);
          if (!settingsRef.current.enabled) {
            scheduler.stop();
          } else {
            scheduler.start();
          }
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
