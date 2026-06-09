import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockVoiceProvider } from "./mockVoiceProvider";
import { SHOWCASE_VOICE_SCRIPT } from "@/showcase/showcaseFixtures";

describe("MockVoiceProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips welcome utterance when skipWelcomeUtterance is set", async () => {
    const voice = new MockVoiceProvider();
    const lines: string[] = [];
    voice.onTranscript((e) => {
      if (e.final) {
        lines.push(e.text);
      }
    });

    const connectPromise = voice.connect({
      apiKey: "",
      skipWelcomeUtterance: true,
    });
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;
    await vi.runAllTimersAsync();

    expect(voice.getState()).toBe("listening");
    expect(lines).toEqual([]);
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

  it("speak emits onSpeakProgress chunks and supports setVoice", async () => {
    const voice = new MockVoiceProvider();
    const progress: string[] = [];
    voice.onSpeakProgress((evt) => {
      if (evt.chunk) {
        progress.push(evt.chunk);
      }
    });

    const speakPromise = voice.speak("麦克风自检就绪");
    await vi.runAllTimersAsync();
    await speakPromise;

    expect(progress.length).toBeGreaterThan(0);
    expect(progress.join("")).toContain("麦克风");

    voice.setVoice("nova");
    expect(voice.getVoice()).toBe("nova");
  });

  it("interrupt stops speak() early", async () => {
    const voice = new MockVoiceProvider();
    const speakPromise = voice.speak("这是一段较长的自检播报文本用于打断测试");
    await vi.advanceTimersByTimeAsync(1);
    expect(voice.getState()).toBe("speaking");
    await voice.interrupt();
    await speakPromise;
    expect(voice.getState()).toBe("idle");
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

  it("replays the full showcase voice script in order", async () => {
    const voice = new MockVoiceProvider();
    const finals: string[] = [];
    voice.onTranscript((event) => {
      if (event.final && event.role === "user") {
        finals.push(event.text);
      }
    });

    const connectPromise = voice.connect({
      apiKey: "",
      skipWelcomeUtterance: true,
    });
    await vi.advanceTimersByTimeAsync(600);
    await connectPromise;

    const replayPromise = voice.injectShowcaseVoiceScript();
    await vi.runAllTimersAsync();
    await replayPromise;

    expect(finals).toEqual(SHOWCASE_VOICE_SCRIPT.map((step) => step.transcript));
    expect(voice.getState()).toBe("listening");
  });
});
