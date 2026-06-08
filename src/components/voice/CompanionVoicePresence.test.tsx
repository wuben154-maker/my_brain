/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanionVoicePresence } from "@/components/voice/CompanionVoicePresence";

const useVoiceSessionMock = vi.fn();

vi.mock("@/hooks/useVoiceSession", () => ({
  useVoiceSession: () => useVoiceSessionMock(),
}));

describe("CompanionVoicePresence", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows listening copy when voice is connected and listening", () => {
    useVoiceSessionMock.mockReturnValue({
      voiceState: "listening",
      isConnected: true,
    });
    render(createElement(CompanionVoicePresence));
    expect(screen.getByTestId("companion-voice-presence").textContent).toBe(
      "正在聆听…",
    );
  });

  it("renders nothing before voice connects", () => {
    useVoiceSessionMock.mockReturnValue({
      voiceState: "idle",
      isConnected: false,
    });
    render(createElement(CompanionVoicePresence));
    expect(screen.queryByTestId("companion-voice-presence")).toBeNull();
  });
});
