import { REALTIME_SAMPLE_RATE, base64ToArrayBuffer, pcm16ToFloat32 } from "./pcm";

export class SpeakerPlayback {
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();

  async ensureReady(): Promise<AudioContext> {
    if (!this.audioContext || this.audioContext.state === "closed") {
      this.audioContext = new AudioContext({ sampleRate: REALTIME_SAMPLE_RATE });
      this.nextStartTime = 0;
    }
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  async enqueuePcm16Base64(base64: string): Promise<void> {
    const audioContext = await this.ensureReady();
    const pcm = new Int16Array(base64ToArrayBuffer(base64));
    const float32 = pcm16ToFloat32(pcm);
    const buffer = audioContext.createBuffer(1, float32.length, REALTIME_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    const now = audioContext.currentTime;
    if (this.nextStartTime < now) {
      this.nextStartTime = now;
    }
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };
  }

  stopImmediately(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }
    this.activeSources.clear();
    this.nextStartTime = 0;
    void this.audioContext?.close();
    this.audioContext = null;
  }
}
