import { useEffect, useRef, useState } from "react";

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  const date = now
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();

  return { time, date };
}

/** Top brand bar — real clock, decorative user chip. */
export function BootTopBar() {
  const { time, date } = useLiveClock();

  return (
    <header className="boot-top-bar" aria-hidden={false}>
      <div className="boot-top-brand">
        <span className="boot-brand-glyph" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
            <path
              d="M12 3c-3.5 0-6 2.8-6 6.5 0 2.2 1.1 4.1 2.8 5.2-.9.8-1.5 2-1.5 3.3 0 2.4 2 4.3 4.5 4.3h.4c2.5 0 4.5-1.9 4.5-4.3 0-1.3-.6-2.5-1.5-3.3 1.7-1.1 2.8-3 2.8-5.2C18 5.8 15.5 3 12 3z"
              stroke="currentColor"
              strokeWidth="1.2"
              className="text-accent-cyan"
            />
            <circle cx="9" cy="11" r="1" fill="currentColor" className="text-accent-cyan/80" />
            <circle cx="15" cy="11" r="1" fill="currentColor" className="text-accent-cyan/80" />
          </svg>
        </span>
        <div className="boot-brand-wordmark">
          <span className="boot-brand-nexus">NEXUS</span>
          <span className="boot-brand-sub">SECOND BRAIN</span>
        </div>
      </div>

      <div className="boot-top-title">
        <p className="boot-top-eyebrow">SYSTEM BOOT SEQUENCE</p>
        <h1 className="boot-top-heading">INITIALIZING SECOND BRAIN</h1>
      </div>

      <div className="boot-top-meta">
        <div className="boot-top-clock" aria-live="off">
          <span className="boot-clock-time">{time}</span>
          <span className="boot-clock-date">{date}</span>
        </div>
        <div className="boot-user-chip" aria-hidden>
          <span className="boot-user-avatar" />
          <span className="boot-user-name">USER</span>
        </div>
      </div>
    </header>
  );
}

/** Left periphery — decorative telemetry only, not interactive. */
export function BootAmbientTelemetry() {
  return (
    <aside className="boot-ambient-col" aria-hidden>
      <div className="boot-telemetry-card">
        <span className="boot-telemetry-label">SYSTEM CORE TEMP</span>
        <div className="boot-telemetry-row">
          <span className="boot-telemetry-value">36.7°C</span>
          <span className="boot-telemetry-badge boot-telemetry-badge-ok">NOMINAL</span>
        </div>
        <div className="boot-sparkline boot-sparkline-green">
          {[0.3, 0.5, 0.4, 0.6, 0.5, 0.55, 0.48].map((h, i) => (
            <span key={i} style={{ height: `${h * 100}%` }} />
          ))}
        </div>
      </div>

      <div className="boot-telemetry-card">
        <span className="boot-telemetry-label">NEURAL LOAD</span>
        <div className="boot-telemetry-row">
          <span className="boot-telemetry-value">23%</span>
          <span className="boot-telemetry-badge boot-telemetry-badge-cyan">OPTIMAL</span>
        </div>
        <div className="boot-sparkline boot-sparkline-cyan">
          {[0.2, 0.35, 0.3, 0.4, 0.28, 0.32, 0.25].map((h, i) => (
            <span key={i} style={{ height: `${h * 100}%` }} />
          ))}
        </div>
      </div>

      <div className="boot-telemetry-card">
        <span className="boot-telemetry-label">POWER STATUS</span>
        <div className="boot-telemetry-row">
          <span className="boot-telemetry-value">100%</span>
          <span className="boot-telemetry-badge boot-telemetry-badge-ok">STABLE</span>
        </div>
        <div className="boot-power-bar">
          <div className="boot-power-fill" />
        </div>
      </div>
    </aside>
  );
}

interface BootLogStreamProps {
  logs: string[];
}

function BootLogStream({ logs }: BootLogStreamProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  return (
    <div className="boot-ribbon-glass boot-log-panel" aria-live="polite" aria-label="系统日志">
      <p className="boot-ribbon-label">SYSTEM LOG</p>
      <div className="boot-log-scroll">
        {logs.map((line, index) => (
          <p
            key={`${index}-${line}`}
            className={[
              "boot-log-line",
              line.startsWith("✓")
                ? "text-status-ok"
                : line.startsWith("!")
                  ? "text-status-warn"
                  : line.startsWith(">")
                    ? "text-accent-cyan"
                    : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {line}
          </p>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

/** Bottom ribbon — quote, objectives, services, log, radar. */
export function BootBottomRibbon({
  logs,
  onSkipVoice,
}: {
  logs: string[];
  onSkipVoice?: () => void;
}) {
  return (
    <footer className="boot-bottom-ribbon">
      <div className="boot-ribbon-glass boot-ribbon-quote" aria-hidden>
        <div className="boot-quote-icosahedron" />
        <blockquote className="boot-quote-text">
          &ldquo;The mind is not a vessel to be filled, but a fire to be kindled.&rdquo;
          <cite>— Plutarch</cite>
        </blockquote>
      </div>

      <div className="boot-ribbon-glass boot-ribbon-objectives" aria-hidden>
        <p className="boot-ribbon-label">ACTIVE OBJECTIVE</p>
        <ul className="boot-objective-list">
          <li>Organize knowledge</li>
          <li>Amplify intelligence</li>
          <li>Expand potential</li>
        </ul>
      </div>

      <div className="boot-ribbon-glass boot-ribbon-services" aria-hidden>
        <p className="boot-ribbon-label">CONNECTED SERVICES</p>
        <div className="boot-service-icons">
          {(
            [
              { glyph: "N", brand: "notion" },
              { glyph: "G", brand: "drive" },
              { glyph: "S", brand: "slack" },
              { glyph: "X", brand: "twitter" },
              { glyph: "D", brand: "discord" },
              { glyph: "L", brand: "linkedin" },
              { glyph: "M", brand: "microsoft" },
            ] as const
          ).map(({ glyph, brand }) => (
            <span key={brand} className={`boot-service-icon boot-service-${brand}`}>
              {glyph}
            </span>
          ))}
        </div>
        <span className="boot-service-count">7 CONNECTED</span>
      </div>

      <BootLogStream logs={logs} />

      <div className="boot-ribbon-radar" aria-hidden>
        <div className="boot-radar-scope">
          <div className="boot-radar-sweep" />
          <div className="boot-radar-blip boot-radar-blip-1" />
          <div className="boot-radar-blip boot-radar-blip-2" />
        </div>
      </div>

      {onSkipVoice ? (
        <button
          type="button"
          data-testid="boot-skip-voice"
          className="boot-skip-btn"
          onClick={onSkipVoice}
        >
          跳过语音播报
        </button>
      ) : null}
    </footer>
  );
}
