import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockVoiceProvider } from "./mockVoiceProvider";

describe("MockVoiceProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("connects and greets in mock mode", async () => {
    const voice = new MockVoiceProvider();
    const states: string[] = [];
    const lines: string[] = [];
    voice.onStateChange((s) => states.push(s));
    voice.onTranscript((e) => {
      if (e.final) {
        lines.push(`${e.role}:${e.text.slice(0, 12)}`);
      }
    });

    const connectPromise = voice.connect({ apiKey: "" });
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;

    expect(voice.getState()).toBe("listening");
    expect(states).toContain("connecting");
    expect(states).toContain("listening");

    await vi.runAllTimersAsync();
    expect(lines.some((l) => l.startsWith("assistant:"))).toBe(true);
  });

  it("runs user turn and supports interrupt during speaking", async () => {
    const voice = new MockVoiceProvider();
    voice.onTranscript(() => undefined);

    const connectPromise = voice.connect({ apiKey: "" });
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;
    await vi.runAllTimersAsync();

    voice.simulateUserSpeech("讲讲资讯");
    await vi.advanceTimersByTimeAsync(700);
    expect(voice.getState()).toBe("speaking");

    await voice.interrupt();
    expect(voice.getState()).toBe("listening");
  });

  it("barge-in via simulateUserSpeech while speaking", async () => {
    const voice = new MockVoiceProvider();
    const finals: string[] = [];
    voice.onTranscript((e) => {
      if (e.final && e.role === "user") {
        finals.push(e.text);
      }
    });

    const connectPromise = voice.connect({ apiKey: "" });
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;
    await vi.runAllTimersAsync();

    voice.simulateUserSpeech("第一条");
    await vi.advanceTimersByTimeAsync(2500);
    voice.simulateUserSpeech("打断");
    await vi.runAllTimersAsync();

    expect(finals).toContain("打断");
  });
});
