import { useMemo } from "react";
import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { GraphUndoControl } from "@/components/shell/GraphUndoControl";
import { SettingsOverlay } from "@/components/settings/SettingsOverlay";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { isGraphDemoMode } from "@/lib/graphDemoSeed";
import {
  DEMO_VOICE_TRANSCRIPTS,
  VISUAL_VOICE_TRANSCRIPTS,
} from "@/lib/visualSnapshotFixtures";
import { isVisualSnapshotMode } from "@/lib/visualSnapshotMode";

/** Transcript bubbles — display-only; reuses VoicePanel transcript sources. */
function VoiceConversationFeed() {
  const visualSnapshot = isVisualSnapshotMode();
  const { transcripts, isConnected, isMockVoice } = useVoiceSession();
  const demoMode = !visualSnapshot && !isConnected && isGraphDemoMode();

  const displayTranscripts = useMemo(() => {
    if (visualSnapshot) {
      return VISUAL_VOICE_TRANSCRIPTS;
    }
    if (demoMode) {
      return DEMO_VOICE_TRANSCRIPTS;
    }
    return transcripts;
  }, [demoMode, transcripts, visualSnapshot]);

  return (
    <div
      data-testid="voice-transcript-feed"
      className="min-h-0 flex-1 overflow-y-auto rounded-md border border-hud bg-bg-overlay/50 p-4"
    >
      {displayTranscripts.length === 0 ? (
        <p className="text-body text-muted">
          {isMockVoice
            ? "连接后点「连接语音」，开始对话。"
            : "连接后直接开口说话。助手会先听你说，再语音回复。"}
        </p>
      ) : (
        <ul className="space-y-3">
          {displayTranscripts.map((line) => (
            <li
              key={line.id}
              className={[
                "max-w-[92%] rounded-md px-3 py-2 text-body",
                line.role === "user"
                  ? "ml-auto bg-accent-blue/15 text-primary"
                  : "mr-auto bg-bg-panel text-secondary",
                !line.final ? "opacity-80" : "",
              ].join(" ")}
            >
              <span className="mr-2 font-hud text-caption uppercase tracking-hud text-muted">
                {line.role === "user" ? "你" : "助手"}
              </span>
              {line.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** V0 companion shell — 2/3 graph + 1/3 voice panel split. */
export function ImmersiveScene() {
  return (
    <div
      data-testid="immersive-scene"
      className="grid h-full w-full grid-cols-[2fr_1fr] overflow-hidden"
    >
      <div
        data-testid="graph-pane"
        className="relative min-h-0 min-w-0 overflow-hidden"
      >
        <BrainGraphView />
        <div className="absolute bottom-4 left-4 z-20">
          <GraphUndoControl />
        </div>
      </div>

      <div
        data-testid="voice-pane"
        className="relative flex min-h-0 min-w-0 flex-col border-l border-hud bg-bg-elevated/80 shadow-glow-cyan backdrop-blur-md"
      >
        <div className="flex shrink-0 items-center justify-end gap-2 p-4">
          <SettingsOverlay />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 pb-4">
          <div className="flex shrink-0 justify-center">
            <VoiceOrb />
          </div>
          <VoiceConversationFeed />
        </div>
      </div>
    </div>
  );
}
