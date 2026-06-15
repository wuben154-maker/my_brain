export interface PlaybackChunk {
  id: string;
  durationMs: number;
}

export interface MockRealtimeTransport {
  enqueueChunks(chunks: PlaybackChunk[]): void;
  interrupt(): void;
  isPlaying(): boolean;
  getQueuedCount(): number;
  onStateChange(cb: (playing: boolean) => void): () => void;
}

/**
 * Mock TTS playback queue — no raw audio bytes persisted; chunk metadata only.
 */
export function createMockRealtimePlaybackQueue(): MockRealtimeTransport {
  let queue: PlaybackChunk[] = [];
  let playing = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(playing: boolean) => void>();

  const setPlaying = (next: boolean) => {
    playing = next;
    listeners.forEach((l) => l(playing));
  };

  const drain = () => {
    if (queue.length === 0) {
      setPlaying(false);
      return;
    }
    const chunk = queue.shift()!;
    setPlaying(true);
    timer = setTimeout(() => {
      timer = null;
      drain();
    }, chunk.durationMs);
  };

  return {
    enqueueChunks(chunks: PlaybackChunk[]) {
      queue = [...queue, ...chunks];
      if (!playing) {
        drain();
      }
    },
    interrupt() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      queue = [];
      setPlaying(false);
    },
    isPlaying: () => playing,
    getQueuedCount: () => queue.length + (playing ? 1 : 0),
    onStateChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}
