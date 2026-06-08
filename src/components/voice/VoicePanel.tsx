import { useEffect, useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  VisualListeningBar,
  VisualVoiceOrb,
} from "@/components/voice/VisualVoiceChrome";
import {
  DEMO_VOICE_TRANSCRIPTS,
  VISUAL_VOICE_TRANSCRIPTS,
} from "@/lib/visualSnapshotFixtures";
import { isGraphDemoMode } from "@/lib/graphDemoSeed";
import {
  isCompanionMainVisualSnapshot,
  isVisualSnapshotMode,
} from "@/lib/visualSnapshotMode";
import { useVoiceSession } from "@/hooks/useVoiceSession";
import { MOCK_DEFAULT_UTTERANCE } from "@/providers/voice/mockVoiceProvider";
import { useAppStore } from "@/stores/appStore";
import { useProfileStore } from "@/stores/profileStore";

const waveformLevels = [0.25, 0.45, 0.7, 0.55, 0.85, 0.4, 0.65, 0.3];
const visualWaveformHeights = [28, 44, 62, 48, 72, 40, 56, 32];

export function VoicePanel() {
  const visualSnapshot = isVisualSnapshotMode();
  const visualMain = isCompanionMainVisualSnapshot();
  const newsCount = useAppStore((state) => state.newsQueue.length);
  const profile = useProfileStore((state) => state.profile);
  const lastDistilledAt = useProfileStore((state) => state.lastDistilledAt);
  const {
    voiceState,
    statusLabel,
    transcripts,
    errorMessage,
    isBusy,
    isDistilling,
    canUseVoice,
    isMockVoice,
    isConnected,
    connect,
    disconnect,
    interrupt,
    simulateUserSpeech,
  } = useVoiceSession();

  // Dev-only: when launched via `?graphDemo`, seed a believable conversation so
  // the first screen reads as a live session. Display only — no real session
  // state, no persistence, and it yields the moment a real connection starts.
  const demoMode = !visualSnapshot && !isConnected && isGraphDemoMode();
  const showConnected = visualMain || isConnected;
  const isActive =
    visualMain ||
    demoMode ||
    voiceState === "listening" ||
    voiceState === "speaking";
  const canSimulate =
    !visualMain &&
    isMockVoice &&
    isConnected &&
    (voiceState === "listening" || voiceState === "speaking");
  const displayStatus = visualMain ? "待命" : statusLabel;
  const displayNewsCount = visualMain ? 3 : newsCount;

  const waveformHeights = useMemo(() => {
    if (visualSnapshot) {
      return visualWaveformHeights;
    }
    if (demoMode) {
      return visualWaveformHeights;
    }
    if (!isActive) {
      return waveformLevels.map(() => 12);
    }
    const boost = voiceState === "speaking" ? 1 : 0.75;
    return waveformLevels.map((level) => 24 + level * 72 * boost);
  }, [demoMode, isActive, visualSnapshot, voiceState]);

  const displayTranscripts = visualSnapshot
    ? VISUAL_VOICE_TRANSCRIPTS
    : demoMode
      ? DEMO_VOICE_TRANSCRIPTS
      : transcripts;

  useEffect(() => {
    if (!isMockVoice || !isConnected) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) {
        return;
      }
      event.preventDefault();
      if (voiceState === "speaking") {
        void interrupt();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }
      event.preventDefault();
      if (voiceState === "listening") {
        simulateUserSpeech();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    interrupt,
    isConnected,
    isMockVoice,
    simulateUserSpeech,
    voiceState,
  ]);

  const profileSummary = useMemo(() => {
    const parts: string[] = [];
    if (profile.displayName) {
      parts.push(profile.displayName);
    }
    if (profile.interests.length > 0) {
      parts.push(`兴趣 ${profile.interests.slice(0, 2).join("、")}`);
    }
    if (profile.unknownTopics.length > 0) {
      parts.push(`待学 ${profile.unknownTopics[0]}`);
    }
    if (profile.explanationStyle) {
      parts.push(profile.explanationStyle);
    }
    return parts.join(" · ");
  }, [profile]);

  if (visualMain) {
    return (
      <aside data-testid="voice-panel" className="flex h-full flex-col">
        <div className="flex h-full flex-col overflow-hidden rounded-md border border-hud bg-bg-elevated/40 p-3 backdrop-blur-md">
          <div className="h-[18%] min-h-[160px] shrink-0">
            <VisualVoiceOrb />
          </div>

          <div className="visual-voice-chat pointer-events-none min-h-0 flex-1 overflow-hidden px-1 py-2 opacity-80">
            <ul className="space-y-2">
              {VISUAL_VOICE_TRANSCRIPTS.slice(0, 2).map((line) => (
                <li
                  key={line.id}
                  className={[
                    "max-w-[92%] rounded-md px-2 py-1.5 text-[0.6875rem] leading-snug",
                    line.role === "user"
                      ? "ml-auto border border-accent-cyan/30 bg-accent-blue/15 text-primary"
                      : "mr-auto bg-bg-panel/70 text-secondary",
                  ].join(" ")}
                >
                  {line.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto shrink-0 pt-2">
            <VisualListeningBar />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside data-testid="voice-panel" className="flex h-full flex-col">
      <GlassCard active className="flex h-full flex-col p-5">
        <header>
          <p className="font-hud text-label uppercase tracking-hud text-muted">
            语音通道
          </p>
          <h2 className="mt-2 text-h1 font-medium text-primary">实时对话</h2>
          <p className="mt-2 text-body text-secondary">
            {visualMain
              ? "OpenAI Realtime · 支持随时打断（barge-in）"
              : isMockVoice
                ? "Mock 语音 · 模拟输入/输出与 barge-in"
                : "OpenAI Realtime · 支持随时打断（barge-in）"}
          </p>
        </header>

        <div className="mt-6 flex flex-1 flex-col gap-5 overflow-hidden">
          <div
            className={[
              "relative flex h-28 items-end justify-center gap-2 rounded-md border border-hud bg-bg-elevated/40 px-4 pb-3 pt-6",
              voiceState === "speaking" ? "shadow-glow-cyan" : "",
            ].join(" ")}
          >
            {voiceState === "listening" ? (
              <div className="boot-orb-core absolute left-1/2 top-4 h-10 w-10 -translate-x-1/2 rounded-full opacity-80" />
            ) : null}
            {waveformHeights.map((height, index) => (
              <div
                key={index}
                className={[
                  "w-2 rounded-full transition-all duration-150",
                  visualMain || demoMode || voiceState === "speaking"
                    ? "bg-accent-cyan"
                    : "bg-accent-blue",
                ].join(" ")}
                style={{
                  height: `${height}px`,
                  opacity: visualMain ? 0.88 : isActive ? 0.95 : 0.35,
                }}
              />
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-hud bg-bg-overlay/50 p-4">
            {displayTranscripts.length === 0 ? (
              <p className="text-body text-muted">
                {isMockVoice
                  ? "连接后点「模拟说话」，或按住空格、松开发送。"
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

          <div className="space-y-3">
            <div className="rounded-md border border-hud bg-bg-elevated/50 p-4 text-body text-secondary">
              <p className="text-primary">状态：{displayStatus}</p>
              {isDistilling ? (
                <p className="mt-2 text-caption text-accent-cyan">
                  正在蒸馏用户画像…（丢弃转写前先写入本地）
                </p>
              ) : null}
              {profileSummary ? (
                <p className="mt-2 text-caption text-secondary">
                  懂你层：{profileSummary}
                  {lastDistilledAt ? " · 已更新" : ""}
                </p>
              ) : (
                <p className="mt-2 text-caption text-muted">
                  断开连接后，对话兴趣与讲解偏好会蒸馏进本地画像
                </p>
              )}
              {isMockVoice && voiceState === "listening" ? (
                <p className="mt-2 text-caption text-accent-cyan">
                  正在聆听…松开空格结束
                </p>
              ) : null}
              <p className="mt-2 text-caption text-muted">
                今日候选资讯 {displayNewsCount} 条 · 入库需逐条确认「入库?」
              </p>
              {errorMessage ? (
                <p className="mt-2 text-caption text-status-error">{errorMessage}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {!showConnected ? (
                <button
                  type="button"
                  disabled={!canUseVoice || isBusy}
                  onClick={() => void connect()}
                  className="rounded-sm bg-accent-cyan px-4 py-2 text-body font-medium text-bg-base disabled:cursor-not-allowed disabled:opacity-40"
                >
                  连接语音
                </button>
              ) : (
                <>
                  {isMockVoice ? (
                    <button
                      type="button"
                      disabled={!canSimulate || isBusy}
                      onClick={() => simulateUserSpeech(MOCK_DEFAULT_UTTERANCE)}
                      className="rounded-sm bg-accent-blue px-4 py-2 text-body font-medium text-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      模拟说话
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={isBusy || voiceState !== "speaking"}
                    onClick={() => void interrupt()}
                    className="rounded-sm border border-hud px-4 py-2 text-body text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    打断
                  </button>
                  <button
                    type="button"
                    disabled={isBusy || isDistilling}
                    onClick={() => void disconnect()}
                    className="rounded-sm border border-status-error/40 px-4 py-2 text-body text-status-error disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    断开
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
    </aside>
  );
}
