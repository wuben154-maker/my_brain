import { useVoiceSession } from "@/hooks/useVoiceSession";

function presenceLabel(
  connected: boolean,
  voiceState: string,
): string | null {
  if (!connected) {
    return null;
  }
  if (voiceState === "speaking") {
    return "伴侣正在说话…";
  }
  if (voiceState === "listening") {
    return "正在聆听…";
  }
  if (voiceState === "connecting") {
    return "伴侣正在连接…";
  }
  return "主动为你整理知识";
}

/** Passive voice status under the decorative orb — not a CTA. */
export function CompanionVoicePresence() {
  const { voiceState, isConnected } = useVoiceSession();
  const label = presenceLabel(isConnected, voiceState);

  if (!label) {
    return null;
  }

  return (
    <p
      data-testid="companion-voice-presence"
      className="companion-voice-presence mt-4 text-center text-caption text-accent-cyan/85"
      aria-live="polite"
    >
      {label}
    </p>
  );
}
