import { describe, expect, it, vi } from "vitest";

import { createMockRealtimePlaybackQueue } from "./mockRealtimeTransport";

describe("mockRealtime barge-in", () => {
  it("clears playback queue immediately on interrupt", () => {
    vi.useFakeTimers();
    const transport = createMockRealtimePlaybackQueue();
    transport.enqueueChunks([
      { id: "a", durationMs: 100 },
      { id: "b", durationMs: 100 },
      { id: "c", durationMs: 100 },
    ]);
    expect(transport.isPlaying()).toBe(true);
    expect(transport.getQueuedCount()).toBeGreaterThan(0);
    transport.interrupt();
    expect(transport.isPlaying()).toBe(false);
    expect(transport.getQueuedCount()).toBe(0);
    vi.useRealTimers();
  });
});
