/**
 * Cold-start / foreground wiring for native share handoff drain.
 * Device Extension/App Group evidence remains PENDING_DEVICE.
 */

import { AppState, type AppStateStatus } from "react-native";

import { useProvisionalStore } from "../stores/provisionalStore";
import { pollAndroidIntentBridge, wireAndroidIntentBridge } from "./androidIntentBridge";
import { restoreNativeShareHandoffQueue } from "./nativeShareHandoff";
import { ensureNativeShareHandoffPersistenceReady } from "./nativeShareHandoffPersistence";

let lifecycleWired = false;

/** Poll Android intent bridge, restore persisted queue, drain into provisional store. */
export async function runNativeShareHandoffLifecycleDrain(): Promise<void> {
  await pollAndroidIntentBridge();
  await ensureNativeShareHandoffPersistenceReady();
  restoreNativeShareHandoffQueue();
  await useProvisionalStore.getState().drainNativeShareHandoffQueue();
}

/** Wire cold-start + foreground active drain (mock lifecycle; safe to call once). */
export function wireNativeShareHandoffLifecycle(): void {
  if (lifecycleWired) {
    return;
  }
  lifecycleWired = true;
  wireAndroidIntentBridge();
  void runNativeShareHandoffLifecycleDrain();
  AppState.addEventListener("change", (nextState: AppStateStatus) => {
    if (nextState === "active") {
      void runNativeShareHandoffLifecycleDrain();
    }
  });
}

/** Test helper — reset singleton wiring guard. */
export function resetNativeShareHandoffLifecycleForTests(): void {
  lifecycleWired = false;
}
