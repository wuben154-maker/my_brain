import { APP_META_SCHEDULER } from "@/storage/appMeta";
import type { StorageProvider } from "@/storage/types";
import type { SchedulerConfig } from "./scheduler";

export interface StoredSchedulerSettings extends SchedulerConfig {
  lastRunAt: string | null;
}

export const DEFAULT_SCHEDULER_SETTINGS: StoredSchedulerSettings = {
  enabled: false,
  intervalMs: 6 * 60 * 60 * 1000,
  jobId: "morning-brief",
  lastRunAt: null,
};

export const MIN_SCHEDULER_INTERVAL_MS = 60 * 60 * 1000;

export function normalizeSchedulerSettings(
  partial: Partial<StoredSchedulerSettings>,
): StoredSchedulerSettings {
  const intervalMs =
    typeof partial.intervalMs === "number" && partial.intervalMs >= MIN_SCHEDULER_INTERVAL_MS
      ? partial.intervalMs
      : DEFAULT_SCHEDULER_SETTINGS.intervalMs;

  return {
    enabled: Boolean(partial.enabled),
    intervalMs,
    jobId: partial.jobId?.trim() || DEFAULT_SCHEDULER_SETTINGS.jobId,
    lastRunAt:
      typeof partial.lastRunAt === "string" ? partial.lastRunAt : null,
  };
}

export async function loadSchedulerSettings(
  storage: StorageProvider,
): Promise<StoredSchedulerSettings> {
  const raw = await storage.getAppMeta(APP_META_SCHEDULER);
  if (!raw) {
    return { ...DEFAULT_SCHEDULER_SETTINGS };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSchedulerSettings>;
    return normalizeSchedulerSettings(parsed);
  } catch {
    return { ...DEFAULT_SCHEDULER_SETTINGS };
  }
}

export async function saveSchedulerSettings(
  storage: StorageProvider,
  settings: StoredSchedulerSettings,
): Promise<void> {
  const normalized = normalizeSchedulerSettings(settings);
  await storage.setAppMeta(APP_META_SCHEDULER, JSON.stringify(normalized));
}
