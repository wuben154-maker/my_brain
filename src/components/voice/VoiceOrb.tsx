import { useEffect, useRef } from "react";
import { useConversationSession } from "@/hooks/useConversationSession";
import { isGraphDemoMode } from "@/lib/graphDemoSeed";
import { isVisualSnapshotMode } from "@/lib/visualSnapshotMode";
import { useVoiceSession } from "@/hooks/useVoiceSession";

/**
 * Functional voice controls ? status + connect/disconnect/interrupt.
 * Decorative orb visual lives in VoiceVisualizationPanel (ImmersiveScene).
 */
export function VoiceOrb() {
  const visualSnapshot = isVisualSnapshotMode();
  const demoMode = !visualSnapshot && isGraphDemoMode();
  const {
    voiceState,
    statusLabel,
    errorMessage,
    isBusy,
    canUseVoice,
    isConnected,
    transcripts,
    connect,
    disconnect,
    interrupt,
  } = useVoiceSession();

  const { onUserTranscript, onUserInterrupt } = useConversationSession({
    voiceConnected: isConnected,
  });

  const processedTranscriptIds = useRef(new Set<string>());

  useEffect(() => {
    if (!isConnected || demoMode || visualSnapshot) {
      return;
    }
    for (const line of transcripts) {
      if (line.role === "user" && line.final && !processedTranscriptIds.current.has(line.id)) {
        processedTranscriptIds.current.add(line.id);
        onUserTranscript(line.text, true);
      }
    }
  }, [demoMode, isConnected, onUserTranscript, transcripts, visualSnapshot]);

  const handleInterrupt = () => {
    void interrupt();
    onUserInterrupt();
  };

  const showConnected = demoMode || isConnected;
  const displayStatus = demoMode ? "??" : statusLabel;

  if (visualSnapshot || demoMode) {
    return <div data-testid="voice-orb" className="sr-only" aria-hidden />;
  }

  return (
    <div
      data-testid="voice-orb"
      className="flex w-full shrink-0 flex-col items-center gap-3"
    >
      <div className="w-full rounded-md border border-hud/60 bg-bg-elevated/50 px-3 py-2 text-center text-caption text-secondary">
        <p className="text-primary">???{displayStatus}</p>
        {errorMessage ? (
          <p className="mt-1 text-status-error">{errorMessage}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {!showConnected ? (
          <button
            type="button"
            disabled={!canUseVoice || isBusy}
            onClick={() => void connect()}
            className="rounded-sm bg-accent-cyan px-4 py-2 text-body font-medium text-bg-base disabled:cursor-not-allowed disabled:opacity-40"
          >
            ????
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={isBusy || voiceState !== "speaking"}
              onClick={() => void handleInterrupt()}
              className="rounded-sm border border-hud px-3 py-1.5 text-caption text-primary disabled:opacity-40"
            >
              ??
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void disconnect()}
              className="rounded-sm border border-status-error/40 px-3 py-1.5 text-caption text-status-error disabled:opacity-40"
            >
              ??
            </button>
          </>
        )}
      </div>
    </div>
  );
}
