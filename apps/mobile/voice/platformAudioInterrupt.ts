import { createAndroidAudioFocusSimulator } from "./audioFocus";
import { createIosAudioSessionSimulator } from "./audioSession";

export interface AudioInterruptMonitor {
  shouldPauseTts(): boolean;
  subscribe(cb: () => void): () => void;
}

/** Unified AudioFocus / AVAudioSession shim wired into VoiceSession playback pause. */
export function createPlatformAudioInterruptMonitor(
  platform: "android" | "ios" = "android",
): AudioInterruptMonitor {
  if (platform === "ios") {
    const session = createIosAudioSessionSimulator();
    return {
      shouldPauseTts: () => session.shouldPauseTts(),
      subscribe: (cb) => session.onSessionChange(() => cb()),
    };
  }
  const focus = createAndroidAudioFocusSimulator();
  return {
    shouldPauseTts: () => focus.shouldPauseTts(),
    subscribe: (cb) => focus.onFocusChange(() => cb()),
  };
}

export function createTestAudioInterruptMonitor(initialPause = false): AudioInterruptMonitor {
  let paused = initialPause;
  const listeners = new Set<() => void>();
  return {
    shouldPauseTts: () => paused,
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    /** Test-only helper */
    simulatePause(next: boolean) {
      paused = next;
      listeners.forEach((l) => l());
    },
  } as AudioInterruptMonitor & { simulatePause(next: boolean): void };
}
