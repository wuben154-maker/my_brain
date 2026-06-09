import { BOOT_INTRO_MS, sleep } from "@/lib/bootSelfCheck";
import {
  resetLaunchSequenceGuard,
  runLaunchSequence,
} from "@/lib/runLaunchSequence";
import { isShowcaseDemoMode } from "@/showcase/showcaseDemoMode";
import { useAppStore } from "@/stores/appStore";

export interface RunShowcaseLaunchSequenceOptions {
  /** When true (default), show the shortest boot intro before self-check. */
  bootIntro?: boolean;
}

/**
 * KOS-A2: showcase launch wrapper — boot intro → self_check → loading (fixtures) → companion.
 * Requires showcase mode (`?showcase=1` or `VITE_SHOWCASE_DEMO=1`). No live NewsSource fetch.
 */
export async function runShowcaseLaunchSequence(
  options: RunShowcaseLaunchSequenceOptions = {},
): Promise<void> {
  if (!isShowcaseDemoMode()) {
    throw new Error(
      "runShowcaseLaunchSequence: showcase mode is not enabled (?showcase=1 or VITE_SHOWCASE_DEMO=1)",
    );
  }

  const bootIntro = options.bootIntro !== false;
  const store = useAppStore.getState();

  if (bootIntro) {
    store.setPhase("boot");
    await sleep(BOOT_INTRO_MS);
  }

  store.setPhase("self_check");
  await runLaunchSequence();
}

/** Test-only: reset launch guard so showcase launch can run again. */
export function resetShowcaseLaunchGuard(): void {
  resetLaunchSequenceGuard();
}
