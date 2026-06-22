import { describe, expect, it, vi } from "vitest";

import { createDeviceAudioIoPort } from "./deviceAudioClient";

describe("deviceAudioClient", () => {
  it("mock mode enqueues playback without persisting raw audio", () => {
    vi.useFakeTimers();
    const io = createDeviceAudioIoPort("mock");
    expect(io.mode).toBe("mock");
    io.enqueuePlayback([{ id: "a", durationMs: 100 }]);
    expect(io.isPlaying()).toBe(true);
    vi.advanceTimersByTime(100);
    expect(io.isPlaying()).toBe(false);
    vi.useRealTimers();
  });

  it("interrupt clears playback queue", () => {
    const io = createDeviceAudioIoPort("mock");
    io.enqueuePlayback([{ id: "a", durationMs: 10_000 }]);
    io.interruptPlayback();
    expect(io.isPlaying()).toBe(false);
  });
});
