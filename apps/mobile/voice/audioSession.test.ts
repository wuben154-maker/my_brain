import { describe, expect, it } from "vitest";

import { createIosAudioSessionSimulator } from "./audioSession";

describe("iOS AVAudioSession diagnostics", () => {
  it("uses playAndRecord category and pauses on interruption", () => {
    const sim = createIosAudioSessionSimulator();
    expect(sim.getState().category).toBe("playAndRecord");
    sim.simulateInterruption(true);
    expect(sim.shouldPauseTts()).toBe(true);
    sim.simulateBluetoothRoute();
    expect(sim.getState().route).toBe("bluetooth");
    sim.simulateInterruption(false);
    expect(sim.shouldPauseTts()).toBe(false);
  });
});
