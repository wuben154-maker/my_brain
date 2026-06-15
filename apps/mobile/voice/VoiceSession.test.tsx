import { describe, expect, it, vi } from "vitest";

import { TokenExchangeError } from "@my-brain/core";

import { createVoiceSessionController } from "./VoiceSession";

describe("VoiceSession FSM", () => {
  it("connects via mock token exchange and enters listening", async () => {
    const onClear = vi.fn();
    const ctrl = createVoiceSessionController({
      deviceId: "device-abc",
      onClearDegradedVoice: onClear,
    });
    await ctrl.connect();
    expect(ctrl.getFsmState()).toBe("listening");
    expect(onClear).toHaveBeenCalled();
  });

  it("maps voice transcript to ingest intent without persisting audio", async () => {
    const onIntent = vi.fn();
    const ctrl = createVoiceSessionController({
      deviceId: "device-abc",
      onIntent,
    });
    await ctrl.connect();
    const result = ctrl.handleTranscript("入", 1);
    expect(result).toBe("ingest");
    expect(onIntent).toHaveBeenCalledWith("ingest");
    expect(ctrl.getFsmState()).toBe("speaking");
  });

  it("barge-in stops mock playback and returns to listening", async () => {
    vi.useFakeTimers();
    const ctrl = createVoiceSessionController({ deviceId: "device-abc" });
    await ctrl.connect();
    ctrl.simulateAssistantSpeak(1, 10_000);
    expect(ctrl.isTransportPlaying()).toBe(true);
    expect(ctrl.getFsmState()).toBe("speaking");
    vi.advanceTimersByTime(5_000);
    expect(ctrl.isTransportPlaying()).toBe(true);
    expect(ctrl.getFsmState()).toBe("speaking");
    ctrl.bargeIn();
    expect(ctrl.isTransportPlaying()).toBe(false);
    expect(ctrl.getFsmState()).toBe("listening");
    vi.useRealTimers();
  });

  it("token exchange failure sets error and degraded callback", async () => {
    const onDegraded = vi.fn();
    const ctrl = createVoiceSessionController({
      deviceId: "",
      onDegradedVoice: onDegraded,
      tokenClient: {
        exchange: async () => {
          throw new TokenExchangeError("deviceId required");
        },
      },
    });
    await expect(ctrl.connect()).rejects.toThrow(TokenExchangeError);
    expect(ctrl.getFsmState()).toBe("error");
    expect(onDegraded).toHaveBeenCalledWith("token_exchange");
  });

  it("transport error triggers degraded without graph side effects", async () => {
    const onDegraded = vi.fn();
    const ctrl = createVoiceSessionController({
      deviceId: "device-abc",
      onDegradedVoice: onDegraded,
    });
    await ctrl.connect();
    ctrl.simulateTransportError();
    expect(ctrl.getFsmState()).toBe("error");
    expect(onDegraded).toHaveBeenCalledWith("transport");
  });
});
