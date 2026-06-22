import { LAUNCH_MAX_MS } from "./launchTiming";
import { useMobileAppStore } from "../stores/mobileAppStore";

let handoffTimer: ReturnType<typeof setTimeout> | null = null;

function clearLaunchBootHandoffTimer(): void {
  if (handoffTimer != null) {
    clearTimeout(handoffTimer);
    handoffTimer = null;
  }
}

function runLaunchHandoffIfNeeded(): void {
  const state = useMobileAppStore.getState();
  if (state.phase !== "launch") {
    clearLaunchBootHandoffTimer();
    return;
  }
  state.finishLaunch();
  clearLaunchBootHandoffTimer();
}

/** Survives LaunchScreen remounts — guarantees launch phase exits. */
export function scheduleLaunchBootHandoff(): void {
  // Always reschedule: Fast Refresh can leave a stale handoffTimer that never fires.
  clearLaunchBootHandoffTimer();
  handoffTimer = setTimeout(runLaunchHandoffIfNeeded, LAUNCH_MAX_MS);
}

export function resetLaunchBootHandoffForTests(): void {
  clearLaunchBootHandoffTimer();
}
