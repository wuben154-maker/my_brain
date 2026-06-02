import type { AgentScheduler } from "./scheduler";
import type { StoredSchedulerSettings } from "./schedulerSettings";

/** Runtime handle registered by `useAgentScheduler` for N4 settings UI. */
export interface AgentSchedulerRuntime {
  scheduler: AgentScheduler;
  getSettings: () => StoredSchedulerSettings;
  updateSettings: (
    partial: Partial<StoredSchedulerSettings>,
  ) => Promise<StoredSchedulerSettings>;
}

let runtime: AgentSchedulerRuntime | null = null;

export function setAgentSchedulerRuntime(next: AgentSchedulerRuntime | null): void {
  runtime = next;
}

export function getAgentSchedulerRuntime(): AgentSchedulerRuntime | null {
  return runtime;
}
