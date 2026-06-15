import { describe, expect, it } from "vitest";

import { createAndroidAudioFocusSimulator } from "./audioFocus";

describe("Android AudioFocus diagnostics", () => {
  it("pauses TTS on transient focus loss", () => {
    const sim = createAndroidAudioFocusSimulator();
    expect(sim.shouldPauseTts()).toBe(false);
    sim.simulateFocusLossTransient();
    expect(sim.getState().focusState).toBe("loss_transient");
    expect(sim.shouldPauseTts()).toBe(true);
    sim.simulateFocusGain();
    expect(sim.shouldPauseTts()).toBe(false);
  });
});
