/** Build a symmetric multi-bar spectrum for the orb waveform (presentational). */

import { useVoiceSession } from "@/hooks/useVoiceSession";
import { isVisualSnapshotMode } from "@/lib/visualSnapshotMode";

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



/** Frozen heights for pixel baseline — symmetric taper, tallest beside the disc. */
const innerBars = buildOrbWaveform(48);

const sideBars = [8, 16, 28, 36, 32, 36, 28, 16, 8];

function voiceOrbStateClass(
  snapshot: boolean,
  connected: boolean,
  voiceState: string,
): string {
  if (snapshot || !connected) {
    return "";
  }
  if (
    voiceState === "speaking" ||
    voiceState === "listening" ||
    voiceState === "connecting"
  ) {
    return `companion-voice-orb-state-${voiceState}`;
  }
  return "companion-voice-orb-state-idle";
}

/** V2 §4 decorative voice orb — fixed 220px circle; live controls live in VoiceOrb. */

export function VisualVoiceOrb() {
  const snapshot = isVisualSnapshotMode();
  const { voiceState, isConnected } = useVoiceSession();
  const stateClass = voiceOrbStateClass(snapshot, isConnected, voiceState);

  return (

    <div

      data-testid="visual-voice-orb"

      className={[
        "visual-voice-orb",
        "companion-voice-orb-shell",
        stateClass,
      ]
        .filter(Boolean)
        .join(" ")}

    >

      <div className="companion-voice-orb-side companion-voice-orb-side-left" aria-hidden>

        {sideBars.map((height, index) => (

          <span

            key={`l-${index}`}

            className="companion-voice-orb-side-bar"

            style={{ height: `${height}px` }}

          />

        ))}

      </div>



      <div className="companion-voice-orb-disc" aria-hidden>

        <div className="companion-voice-orb-energy companion-voice-orb-energy-outer" />

        <div className="companion-voice-orb-energy companion-voice-orb-energy-mid" />

        <div className="companion-voice-orb-scan-arc" />

        <div className="companion-voice-orb-aurora" />

        <div className="companion-voice-orb-ring companion-voice-orb-ring-outer" />

        <div className="companion-voice-orb-ring companion-voice-orb-ring-mid" />

        <div className="companion-voice-orb-ring companion-voice-orb-ring-inner" />

        <div className="companion-voice-orb-core" />

        <div className="companion-voice-orb-mesh" />

        <div className="companion-voice-orb-wave">

          {innerBars.map((height, index) => (

            <span

              key={index}

              className="companion-voice-orb-wave-bar"

              style={{ height: `${height}px` }}

            />

          ))}

        </div>

      </div>



      <div className="companion-voice-orb-side companion-voice-orb-side-right" aria-hidden>

        {[...sideBars].reverse().map((height, index) => (

          <span

            key={`r-${index}`}

            className="companion-voice-orb-side-bar"

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


