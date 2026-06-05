import { useMemo } from "react";
import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { TopBar } from "@/components/layout/TopBar";
import { GraphUndoControl } from "@/components/shell/GraphUndoControl";
import { SettingsOverlay } from "@/components/settings/SettingsOverlay";
import {
  VisualListeningBar,
  VisualVoiceOrb,
} from "@/components/voice/VisualVoiceChrome";
import { VoiceOrb } from "@/components/voice/VoiceOrb";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { isGraphDemoMode } from "@/lib/graphDemoSeed";
import {
  DEMO_VOICE_TRANSCRIPTS,
  VISUAL_VOICE_TRANSCRIPT_TIMES,
  VISUAL_VOICE_TRANSCRIPTS,
} from "@/lib/visualSnapshotFixtures";
import { isVisualSnapshotMode } from "@/lib/visualSnapshotMode";

const TRANSCRIPT_TIMESTAMPS = ["14:28", "14:29", "14:31", "14:32"] as const;

function formatTranscriptTime(index: number, visualSnapshot: boolean): string {
  if (visualSnapshot) {
    return (
      VISUAL_VOICE_TRANSCRIPT_TIMES[index % VISUAL_VOICE_TRANSCRIPT_TIMES.length] ??
      "10:24:00"
    );
  }
  return TRANSCRIPT_TIMESTAMPS[index % TRANSCRIPT_TIMESTAMPS.length] ?? "14:30";
}

/** Presentational graph pane overlays — title only. */
function GraphPaneChrome() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <h1 className="absolute left-4 top-4 font-hud text-h1 font-semibold tracking-hud text-primary">
        人工智能知识图谱
      </h1>
    </div>
  );
}

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
      className="companion-transcript-feed min-h-0 flex-1 overflow-y-auto rounded-md border border-hud/50 bg-bg-overlay/35 p-3 backdrop-blur-sm"
    >
      {displayTranscripts.length === 0 ? (
        <p className="text-body text-muted">
          {isMockVoice
            ? "连接后点「连接语音」，开始对话。"
            : "连接后直接开口说话。助手会先听你说，再语音回复。"}
        </p>
      ) : (
        <ul className="space-y-4">
          {displayTranscripts.map((line, index) =>
            line.role === "user" ? (
              <li
                key={line.id}
                className={[
                  "ml-auto flex max-w-[92%] flex-row-reverse items-start gap-2",
                  !line.final ? "opacity-80" : "",
                ].join(" ")}
              >
                <span className="companion-avatar-user flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-cyan/45 bg-accent-cyan/18 font-hud text-caption text-accent-cyan">
                  你
                </span>
                <div className="min-w-0 text-right">
                  <div className="mb-1 flex items-center justify-end gap-2 font-hud text-caption text-muted">
                    <span>你</span>
                    <time>{formatTranscriptTime(index, visualSnapshot)}</time>
                  </div>
                  <p className="companion-bubble-user rounded-md rounded-tr-sm border border-accent-cyan/30 bg-accent-cyan/12 px-3 py-2 text-left text-body text-primary shadow-glow-soft">
                    {line.text}
                  </p>
                </div>
              </li>
            ) : (
              <li
                key={line.id}
                className={[
                  "mr-auto flex max-w-[92%] items-start gap-2",
                  !line.final ? "opacity-80" : "",
                ].join(" ")}
              >
                <span
                  className="companion-avatar-assistant flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hud bg-bg-panel/80 text-caption text-secondary"
                  aria-hidden
                >
                  🤖
                </span>
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2 font-hud text-caption text-muted">
                    <span>助手</span>
                    <time>{formatTranscriptTime(index, visualSnapshot)}</time>
                  </div>
                  <p className="companion-bubble-assistant rounded-md rounded-tl-sm border border-hud/80 bg-bg-panel/70 px-3 py-2 text-body text-secondary backdrop-blur-sm">
                    {line.text}
                  </p>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function VoiceVisualizationPanel() {
  return (
    <div className="companion-voice-orb-shell glass-card relative flex shrink-0 items-center justify-center overflow-hidden px-3 py-4">
      <div className="relative z-[1] w-full max-w-[21rem]">
        <VisualVoiceOrb />
      </div>
    </div>
  );
}

function CompanionListeningBar() {
  const waveformHeights = [5, 10, 16, 8, 20, 12, 6, 14, 9, 18, 7, 13, 11, 17];

  return (
    <div className="glass-card glass-card-active companion-listening-bar relative shrink-0 overflow-hidden px-4 py-3">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-accent-cyan/80 shadow-glow-cyan" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center gap-0.5 px-8 pb-1.5 opacity-35">
        {waveformHeights.map((height, index) => (
          <span
            key={index}
            className="w-0.5 rounded-full bg-accent-cyan"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      <div className="relative flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent-cyan/55 bg-accent-cyan/18 text-accent-cyan shadow-glow-cyan">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="font-hud text-h1 font-medium text-primary">正在聆听…</p>
          <p className="mt-0.5 text-caption text-muted">松开空格键结束</p>
        </div>
      </div>
    </div>
  );
}

/** V0 companion shell — top bar + 2/3 graph + 1/3 voice panel split. */
export function ImmersiveScene() {
  const visualSnapshot = isVisualSnapshotMode();

  return (
    <div
      data-testid="immersive-scene"
      className="companion-nebula flex h-full w-full flex-col overflow-hidden"
    >
      <TopBar />

      <div className="grid min-h-0 flex-1 grid-cols-[2fr_1fr] overflow-hidden">
        <div
          data-testid="graph-pane"
          className="companion-graph-pane relative min-h-0 min-w-0 overflow-hidden"
        >
          <GraphPaneChrome />
          <BrainGraphView />
          <div className="pointer-events-auto absolute bottom-4 left-[10.5rem] z-20">
            <GraphUndoControl />
          </div>
        </div>

        <div
          data-testid="voice-pane"
          className="companion-voice-pane relative flex min-h-0 min-w-0 flex-col gap-2.5 border-l border-hud/70 bg-bg-elevated/75 p-3 shadow-glow-soft backdrop-blur-md"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-hud/50 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-accent-cyan" aria-hidden>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                </svg>
              </span>
              <h2 className="font-hud text-h2 font-medium uppercase tracking-hud text-primary">
                语音交互
              </h2>
            </div>
            <div className="relative">
              <SettingsOverlay />
            </div>
          </div>

          <VoiceVisualizationPanel />
          <VoiceOrb />
          <VoiceConversationFeed />
          {visualSnapshot ? <VisualListeningBar /> : <CompanionListeningBar />}
        </div>
      </div>
    </div>
  );
}
