/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VoiceOrb } from "@/components/voice/VoiceOrb";

const useVoiceSessionMock = vi.fn();
const useConversationSessionMock = vi.fn();

vi.mock("@/hooks/useVoiceSession", () => ({
  useVoiceSession: () => useVoiceSessionMock(),
}));

vi.mock("@/hooks/useConversationSession", () => ({
  useConversationSession: () => useConversationSessionMock(),
}));

vi.mock("@/lib/graphDemoSeed", () => ({
  isGraphDemoMode: () => false,
}));

vi.mock("@/lib/visualSnapshotMode", () => ({
  isVisualSnapshotMode: () => false,
}));

describe("VoiceOrb", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("enables interrupt while speaking (including pending response window)", () => {
    const interrupt = vi.fn(async () => undefined);
    useVoiceSessionMock.mockReturnValue({
      voiceState: "speaking",
      statusLabel: "正在说",
      errorMessage: null,
      isBusy: false,
      canUseVoice: true,
      isConnected: true,
      transcripts: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      interrupt,
    });
    useConversationSessionMock.mockReturnValue({
      onUserTranscript: vi.fn(),
      onUserInterrupt: vi.fn(),
    });

    render(createElement(VoiceOrb));
    const buttons = screen.getAllByRole("button");
    const interruptButton = buttons[0]!;
    expect((interruptButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(interruptButton);
    expect(interrupt).toHaveBeenCalled();
  });

  it("disables interrupt while listening without an active response", () => {
    useVoiceSessionMock.mockReturnValue({
      voiceState: "listening",
      statusLabel: "正在听",
      errorMessage: null,
      isBusy: false,
      canUseVoice: true,
      isConnected: true,
      transcripts: [],
      connect: vi.fn(),
      disconnect: vi.fn(),
      interrupt: vi.fn(),
    });
    useConversationSessionMock.mockReturnValue({
      onUserTranscript: vi.fn(),
      onUserInterrupt: vi.fn(),
    });

    render(createElement(VoiceOrb));
    expect((screen.getAllByRole("button")[0] as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
