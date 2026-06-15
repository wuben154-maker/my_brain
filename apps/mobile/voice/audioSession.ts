export type AudioSessionCategory = "playAndRecord" | "playback" | "ambient";

export interface AudioSessionDiagnostics {
  platform: "ios";
  category: AudioSessionCategory;
  interrupted: boolean;
  route: "speaker" | "bluetooth" | "receiver";
}

/**
 * iOS AVAudioSession category diagnostic shim — M3 tests without native module.
 */
export function createIosAudioSessionSimulator() {
  let category: AudioSessionCategory = "playAndRecord";
  let interrupted = false;
  let route: AudioSessionDiagnostics["route"] = "speaker";
  const listeners = new Set<(diag: AudioSessionDiagnostics) => void>();

  const notify = () => {
    const diag: AudioSessionDiagnostics = { platform: "ios", category, interrupted, route };
    listeners.forEach((l) => l(diag));
  };

  return {
    getState: () => ({ platform: "ios" as const, category, interrupted, route }),
    onSessionChange: (cb: (diag: AudioSessionDiagnostics) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    setCategory: (next: AudioSessionCategory) => {
      category = next;
      notify();
    },
    simulateInterruption: (active: boolean) => {
      interrupted = active;
      notify();
    },
    simulateBluetoothRoute: () => {
      route = "bluetooth";
      notify();
    },
    shouldPauseTts: () => interrupted,
  };
}
