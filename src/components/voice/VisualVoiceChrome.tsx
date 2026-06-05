/** Build a symmetric multi-bar spectrum for the orb waveform (presentational). */
function buildOrbWaveform(barCount: number): number[] {
  const bars: number[] = [];
  for (let index = 0; index < barCount; index++) {
    const phase = index / Math.max(1, barCount - 1);
    const envelope = Math.sin(phase * Math.PI);
    const ripple = 0.55 + 0.45 * Math.sin(phase * Math.PI * 10);
    bars.push(Math.round(4 + envelope * ripple * 42));
  }
  return bars;
}

const innerBars = buildOrbWaveform(52);

export function VisualVoiceOrb() {
  return (
    <div className="visual-voice-orb relative flex h-full min-h-[176px] flex-col items-center justify-center overflow-hidden rounded-md border border-hud/70 bg-[rgba(6,10,20,0.78)] px-3 pb-5 pt-3">
      <div className="relative flex h-[8.75rem] w-[8.75rem] items-center justify-center">
        <div className="absolute -inset-2 rounded-full border border-dashed border-accent-cyan/18" />
        <div className="absolute inset-0 rounded-full border border-accent-cyan/22" />
        <div className="absolute inset-2 rounded-full border border-accent-cyan/32" />
        <div className="absolute inset-4 rounded-full border border-accent-cyan/42" />
        <div className="absolute inset-6 rounded-full bg-accent-cyan/16 shadow-glow-cyan" />

        <div className="absolute inset-x-3 top-1/2 flex -translate-y-1/2 items-center gap-px">
          {innerBars.map((height, index) => (
            <span
              key={index}
              className="min-w-0 flex-1 rounded-full bg-accent-cyan"
              style={{
                height: `${height}px`,
                maxWidth: "2.5px",
                opacity: 0.78 + (index % 7) * 0.03,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-0.5">
        {[6, 12, 18, 10, 16, 8, 14].map((height, index) => (
          <span
            key={index}
            className="w-0.5 rounded-full bg-accent-cyan/80"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
    </div>
  );
}

export function VisualListeningBar() {
  const barHeights = [6, 12, 20, 10, 24, 14, 8, 18, 11, 22, 9, 16];

  return (
    <div
      data-testid="visual-listening-bar"
      className="visual-listening-bar overflow-hidden rounded-md border border-accent-cyan/45 bg-[rgba(8,12,22,0.9)]"
    >
      <div className="h-1 bg-accent-cyan shadow-glow-cyan" />
      <div className="flex items-center gap-4 px-4 py-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent-cyan/55 bg-accent-cyan/15 text-accent-cyan shadow-glow-cyan">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-hud text-h1 font-medium text-primary">正在聆听…</p>
          <p className="mt-0.5 text-caption text-muted">松开空格键结束</p>
        </div>
        <div className="flex items-end gap-0.5 opacity-80">
          {barHeights.map((height, index) => (
            <span
              key={index}
              className="w-0.5 rounded-full bg-accent-cyan"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
