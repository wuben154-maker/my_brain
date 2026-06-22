import { DEMO_MODE_META_KEY, MobileStorage, resetDemoStorage, type ResetDemoCoreOptions, type ResetDemoCoreResult } from "@my-brain/core";

/** In-app dev path when storage session is already open. */
export function resetDemoOnSession(
  storage: MobileStorage,
  options?: ResetDemoCoreOptions,
): ResetDemoCoreResult {
  return resetDemoStorage(storage, options);
}

export function readDemoModeFromStorage(storage: MobileStorage): boolean {
  return storage.getMeta(DEMO_MODE_META_KEY) === "true";
}
