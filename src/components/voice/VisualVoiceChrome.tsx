/** Build a symmetric multi-bar spectrum for the orb waveform (presentational). */
function buildOrbWaveform(barCount: number): number[] {
  const bars: number[] = [];
  for (let index = 0; index < barCount; index++) {
    const phase = index / Math.max(1, barCount - 1);
    const envelope = Math.sin(phase * Math.PI);
    const ripple = 0.55 + 0.45 * Math.sin(phase * Math.PI * 10);
    bars.push(Math.round(3 + envelope * ripple * 46));
  }
  return bars;
}

const innerBars = buildOrbWaveform(48);

export function VisualVoiceOrb() {
  return (
    <div className="visual-voice-orb relative flex h-full min-h-[170px] flex-col items-center justify-center overflow-hidden rounded-md border border-hud/80 bg-[rgba(8,12,22,0.72)] px-3 pb-7 pt-5">
      <span className="absolute right-2 top-2 text-[0.625rem] text-muted/80">⌃</span>

      <div className="relative flex h-[7.5rem] w-[7.5rem] items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-dashed border-accent-cyan/25" />
        <div className="absolute inset-3 rounded-full border border-accent-cyan/35" />
        <div className="absolute inset-6 rounded-full border border-accent-cyan/45" />
        <div className="absolute inset-9 rounded-full bg-accent-cyan/20 shadow-glow-cyan" />

        <div className="absolute inset-x-[0.875rem] top-1/2 flex -translate-y-1/2 items-center gap-px">
          {innerBars.map((height, index) => (
            <span
              key={index}
              className="min-w-0 flex-1 rounded-full bg-accent-cyan"
              style={{
                height: `${height}px`,
                maxWidth: "3px",
                opacity: 0.84 + (index % 5) * 0.03,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-0.5">
        {[8, 14, 20, 12, 18, 10].map((height, index) => (
          <span
            key={index}
            className="w-0.5 rounded-full bg-accent-cyan/75"
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      <span className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border border-hud text-[0.625rem] text-secondary/90">
        ⚙
      </span>
    </div>
  );
}

export function VisualListeningBar() {
  return (
    <div
      data-testid="visual-listening-bar"
      className="visual-listening-bar overflow-hidden rounded-md border border-accent-cyan/40 bg-[rgba(10,16,28,0.88)]"
    >
      <div className="h-1.5 bg-accent-cyan shadow-glow-cyan" />
      <div className="px-4 py-5 text-center">
        <p className="text-base font-medium text-primary">正在聆听…</p>
        <p className="mt-2 text-[0.6875rem] text-secondary">松开空格键结束</p>
        <div className="mt-5 flex items-end justify-center gap-0.5">
          {[8, 14, 22, 12, 26, 16, 10, 20, 12].map((height, index) => (
            <span
              key={index}
              className="w-0.5 rounded-full bg-accent-cyan/85"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
