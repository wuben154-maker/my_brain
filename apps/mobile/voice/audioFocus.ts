export type AudioFocusState = "gain" | "loss_transient" | "loss_permanent";

export interface AudioFocusDiagnostics {
  platform: "android";
  focusState: AudioFocusState;
  ducking: boolean;
}

/**
 * Android AudioFocus diagnostic shim — M3 tests simulate focus loss without native AudioManager.
 */
export function createAndroidAudioFocusSimulator() {
  let focusState: AudioFocusState = "gain";
  let ducking = false;
  const listeners = new Set<(diag: AudioFocusDiagnostics) => void>();

  const notify = () => {
    const diag: AudioFocusDiagnostics = { platform: "android", focusState, ducking };
    listeners.forEach((l) => l(diag));
  };

  return {
    getState: () => ({ platform: "android" as const, focusState, ducking }),
    onFocusChange: (cb: (diag: AudioFocusDiagnostics) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    /** Simulate incoming call grabbing focus — TTS should pause. */
    simulateFocusLossTransient: () => {
      focusState = "loss_transient";
      ducking = true;
      notify();
    },
    simulateFocusGain: () => {
      focusState = "gain";
      ducking = false;
      notify();
    },
    shouldPauseTts: () => focusState !== "gain",
  };
}
