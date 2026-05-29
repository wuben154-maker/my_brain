import { useVoiceSession } from "@/hooks/useVoiceSession";
import { useAppStore } from "@/stores/appStore";

const waveformLevels = [0.25, 0.45, 0.7, 0.55, 0.85, 0.4, 0.65, 0.3];

export function VoicePanel() {
  const newsCount = useAppStore((state) => state.newsQueue.length);
  const {
    voiceState,
    statusLabel,
    transcripts,
    errorMessage,
    isBusy,
    canUseVoice,
    isConnected,
    connect,
    disconnect,
    interrupt,
  } = useVoiceSession();

  const isActive = voiceState === "listening" || voiceState === "speaking";

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/10 bg-brain-panel/90 p-6">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-brain-muted">
          语音通道
        </p>
        <h2 className="mt-2 text-xl font-medium text-white">实时对话</h2>
        <p className="mt-2 text-sm text-slate-400">
          OpenAI Realtime · 支持随时打断（barge-in）
        </p>
      </header>

      <div className="mt-8 flex flex-1 flex-col gap-6 overflow-hidden">
        <div className="flex h-28 items-end justify-center gap-2">
          {waveformLevels.map((level, index) => (
            <div
              key={index}
              className="w-2 rounded-full bg-brain-accent transition-all duration-150"
              style={{
                height: isActive ? `${24 + level * 72}px` : "12px",
                opacity: voiceState === "speaking" ? 0.95 : 0.55,
              }}
            />
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-4">
          {transcripts.length === 0 ? (
            <p className="text-sm text-slate-500">
              连接后直接开口说话。助手会先听你说，再语音回复。
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {transcripts.map((line) => (
                <li
                  key={line.id}
                  className={
                    line.role === "user" ? "text-sky-200" : "text-emerald-200"
                  }
                >
                  <span className="mr-2 text-xs uppercase tracking-wider text-slate-500">
                    {line.role === "user" ? "你" : "助手"}
                  </span>
                  {line.text}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-slate-300">
            <p>状态：{statusLabel}</p>
            <p className="mt-2 text-slate-500">
              今日候选资讯 {newsCount} 条 · 入库需逐条确认「入库?」
            </p>
            {errorMessage ? (
              <p className="mt-2 text-red-300">{errorMessage}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {!isConnected ? (
              <button
                type="button"
                disabled={!canUseVoice || isBusy}
                onClick={() => void connect()}
                className="rounded-lg bg-brain-accent px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                连接语音
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isBusy || voiceState !== "speaking"}
                  onClick={() => void interrupt()}
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  打断
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void disconnect()}
                  className="rounded-lg border border-red-400/40 px-4 py-2 text-sm text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  断开
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
