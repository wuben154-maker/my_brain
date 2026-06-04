import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockVoiceProvider } from "@/providers/voice/mockVoiceProvider";
import type { SelfCheckItem } from "@/stores/appStore";
import {
  formatSelfCheckSpeech,
  speakSelfCheck,
} from "@/lib/speakSelfCheck";

const MIC_ITEM: SelfCheckItem = {
  id: "mic",
  label: "麦克风 / 扬声器",
  status: "ok",
};

const API_ITEM: SelfCheckItem = {
  id: "api_key",
  label: "OpenAI API Key",
  status: "warn",
  detail: "在 .env 中设置 VITE_OPENAI_API_KEY",
};

describe("speakSelfCheck", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats ok and warn lines in Chinese", () => {
    expect(formatSelfCheckSpeech(MIC_ITEM)).toContain("麦克风");
    expect(formatSelfCheckSpeech(API_ITEM)).toContain("降级继续");
  });

  it("speaks items in order with mic/network keywords", async () => {
    const voice = new MockVoiceProvider();
    const spoken: string[] = [];
    voice.onSpeakProgress((evt) => spoken.push(evt.text));

    const items: SelfCheckItem[] = [
      MIC_ITEM,
      { id: "network", label: "网络连接", status: "ok" },
    ];

    const promise = speakSelfCheck(items, voice);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.skipped).toBe(false);
    expect(result.spoken).toHaveLength(2);
    expect(result.spoken[0]).toContain("麦克风");
    expect(result.spoken[1]).toContain("网络");
    expect(spoken[0]).toContain("麦克风");
  });

  it("fires onItemStart before each speak", async () => {
    const voice = new MockVoiceProvider();
    const starts: string[] = [];

    const promise = speakSelfCheck(
      [MIC_ITEM, { id: "news", label: "资讯源", status: "ok" }],
      voice,
      { onItemStart: (id) => starts.push(id) },
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(starts).toEqual(["mic", "news"]);
  });

  it("stops when AbortSignal is aborted before speaking", async () => {
    const voice = new MockVoiceProvider();
    const controller = new AbortController();
    controller.abort();

    const result = await speakSelfCheck(
      [
        MIC_ITEM,
        { id: "network", label: "网络连接", status: "ok" },
      ],
      voice,
      { signal: controller.signal },
    );

    expect(result.skipped).toBe(true);
    expect(result.spoken).toHaveLength(0);
  });

});
