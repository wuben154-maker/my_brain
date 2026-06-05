import { useMemo } from "react";
import { BrainGraphView } from "@/components/brain/BrainGraphView";
import { TopBar } from "@/components/layout/TopBar";
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

const TRANSCRIPT_TIMESTAMPS = ["14:28", "14:29", "14:31", "14:32"] as const;

function formatTranscriptTime(index: number): string {
  return TRANSCRIPT_TIMESTAMPS[index % TRANSCRIPT_TIMESTAMPS.length] ?? "14:30";
}

/** Presentational graph pane overlays — title, toolbar. */
function GraphPaneChrome() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <button
          type="button"
          className="pointer-events-auto flex items-center gap-2 rounded-sm px-1 py-1 font-hud text-h1 font-semibold tracking-hud text-primary"
        >
          人工智能知识图谱
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-secondary"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-hud bg-bg-panel px-3 py-1.5 font-hud text-label uppercase tracking-hud text-secondary backdrop-blur-md"
        >
          力导向布局
          <span className="ml-1 text-muted" aria-hidden>
            ▾
          </span>
        </button>
        <button
          type="button"
          aria-label="全屏"
          className="graph-hud-btn pointer-events-auto"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden
          >
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="主题"
          className="graph-hud-btn pointer-events-auto"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </button>
        <button
          type="button"
          className="pointer-events-auto rounded-full border border-accent-cyan bg-accent-cyan/15 px-3 py-1.5 font-hud text-label uppercase tracking-hud text-accent-cyan shadow-glow-cyan backdrop-blur-md"
        >
          3D 视图
        </button>
      </div>
    </div>
  );
}

function TranscriptActionIcons() {
  return (
    <div className="mt-1.5 flex items-center gap-2 text-muted">
      <button type="button" aria-label="复制" className="hover:text-accent-cyan">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="9" y="9" width="11" height="11" rx="1" />
          <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
        </svg>
      </button>
      <button type="button" aria-label="点赞" className="hover:text-accent-cyan">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M7 10v11M15 5.88 14 10h5.83a1 1 0 0 1 .94 1.34l-2.18 6.7a1 1 0 0 1-.94.66H9" />
        </svg>
      </button>
      <button type="button" aria-label="点踩" className="hover:text-accent-cyan">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M17 14V3M9 18.12 10 14H4.17a1 1 0 0 1-.94-1.34l2.18-6.7A1 1 0 0 1 6.35 5H15" />
        </svg>
      </button>
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
      className="min-h-0 flex-1 overflow-y-auto rounded-md border border-hud/60 bg-bg-overlay/40 p-3"
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
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent-cyan/40 bg-accent-cyan/15 font-hud text-caption text-accent-cyan">
                  你
                </span>
                <div className="min-w-0 text-right">
                  <div className="mb-1 flex items-center justify-end gap-2 font-hud text-caption text-muted">
                    <span>你</span>
                    <time>{formatTranscriptTime(index)}</time>
                  </div>
                  <p className="rounded-md rounded-tr-sm border border-accent-cyan/25 bg-accent-cyan/10 px-3 py-2 text-left text-body text-primary">
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
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hud bg-bg-panel text-caption text-secondary"
                  aria-hidden
                >
                  🤖
                </span>
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2 font-hud text-caption text-muted">
                    <span>助手</span>
                    <time>{formatTranscriptTime(index)}</time>
                  </div>
                  <p className="rounded-md rounded-tl-sm border border-hud bg-bg-panel px-3 py-2 text-body text-secondary">
                    {line.text}
                  </p>
                  <TranscriptActionIcons />
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
    <div className="glass-card relative flex min-h-[13rem] shrink-0 items-center justify-center overflow-hidden px-4 py-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-cyan/15" />
        <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-cyan/10" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent-blue/10" />
      </div>

      <div className="relative z-[1] w-full max-w-[20rem] scale-110">
        <VoiceOrb />
      </div>

      <button
        type="button"
        aria-label="麦克风"
        className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-full border border-hud bg-bg-panel text-secondary backdrop-blur-md"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
        </svg>
      </button>
      <span
        className="absolute bottom-3 right-3 h-2 w-2 rounded-full bg-accent-cyan shadow-glow-cyan"
        aria-hidden
      />
    </div>
  );
}

function CompanionListeningBar() {
  const waveformHeights = [6, 12, 18, 10, 22, 14, 8, 16, 11, 20, 9, 15];

  return (
    <div className="glass-card glass-card-active relative shrink-0 overflow-hidden px-4 py-3">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center gap-0.5 px-6 pb-1 opacity-25">
        {waveformHeights.map((height, index) => (
          <span
            key={index}
            className="w-0.5 rounded-full bg-accent-cyan"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      <div className="relative flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent-cyan/50 bg-accent-cyan/15 text-accent-cyan shadow-glow-cyan">
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
  return (
    <div
      data-testid="immersive-scene"
      className="companion-nebula flex h-full w-full flex-col overflow-hidden"
    >
      <TopBar />

      <div className="grid min-h-0 flex-1 grid-cols-[2fr_1fr] overflow-hidden">
        <div
          data-testid="graph-pane"
          className="relative min-h-0 min-w-0 overflow-hidden"
        >
          <GraphPaneChrome />
          <BrainGraphView />
          <div className="pointer-events-auto absolute bottom-4 left-[10.5rem] z-20">
            <GraphUndoControl />
          </div>
        </div>

        <div
          data-testid="voice-pane"
          className="relative flex min-h-0 min-w-0 flex-col gap-3 border-l border-hud bg-bg-elevated/80 p-3 shadow-glow-cyan backdrop-blur-md"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-hud/60 pb-2">
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="折叠语音面板"
                className="flex h-8 w-8 items-center justify-center rounded-sm text-muted hover:text-accent-cyan"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              <div className="relative">
                <SettingsOverlay />
              </div>
            </div>
          </div>

          <VoiceVisualizationPanel />
          <VoiceConversationFeed />
          <CompanionListeningBar />
        </div>
      </div>
    </div>
  );
}
