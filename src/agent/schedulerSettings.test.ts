import { describe, expect, it } from "vitest";
import { createTempStorage, STORAGE_BACKEND_KINDS } from "@/invariants/testStorage";
import {
  DEFAULT_SCHEDULER_SETTINGS,
  loadSchedulerSettings,
  saveSchedulerSettings,
} from "./schedulerSettings";

describe("schedulerSettings (A5)", () => {
  it.each(STORAGE_BACKEND_KINDS)(
    "persists enabled/interval on %s",
    async (kind) => {
      const { storage, cleanup } = createTempStorage(kind);
      try {
        await storage.init();
        await saveSchedulerSettings(storage, {
          ...DEFAULT_SCHEDULER_SETTINGS,
          enabled: true,
          intervalMs: 3_600_000,
        });
        const loaded = await loadSchedulerSettings(storage);
        expect(loaded.enabled).toBe(true);
        expect(loaded.intervalMs).toBe(3_600_000);
        expect(loaded.jobId).toBe("morning-brief");
      } finally {
        cleanup();
      }
    },
  );
});
