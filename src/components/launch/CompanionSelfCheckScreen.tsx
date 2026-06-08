import { SciFiAtmosphere } from "@/components/shell/SciFiAtmosphere";

import {
  computeSelfCheckProgress,
  SELF_CHECK_SUBLABELS,
  statusLabel,
  type BootCheckId,
} from "@/lib/bootSelfCheck";

import {

  useAppStore,

  type BootCheckStatus,

  type SelfCheckItem,

} from "@/stores/appStore";



function CheckItemIcon({ id }: { id: BootCheckId }) {

  const common = {

    width: 18,

    height: 18,

    viewBox: "0 0 24 24",

    fill: "none",

    stroke: "currentColor",

    strokeWidth: 1.6,

    strokeLinecap: "round" as const,

    strokeLinejoin: "round" as const,

  };



  switch (id) {

    case "mic":

      return (

        <svg {...common} aria-hidden>

          <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />

          <path d="M19 11a7 7 0 0 1-14 0" />

          <path d="M12 18v3" />

        </svg>

      );

    case "speaker":

      return (

        <svg {...common} aria-hidden>

          <path d="M11 7 6 10H4v4h2l5 3V7Z" />

          <path d="M15.5 9.5a4 4 0 0 1 0 5" />

          <path d="M17.8 7.2a7 7 0 0 1 0 9.6" />

        </svg>

      );

    case "network":

      return (

        <svg {...common} aria-hidden>

          <circle cx="12" cy="12" r="9" />

          <path d="M3 12h18" />

          <path d="M12 3a14 14 0 0 1 0 18" />

          <path d="M12 3a14 14 0 0 0 0 18" />

        </svg>

      );

    case "news":

      return (

        <svg {...common} aria-hidden>

          <path d="M6 5h12v14H6z" />

          <path d="M9 9h6" />

          <path d="M9 12h6" />

          <path d="M9 15h4" />

        </svg>

      );

    case "storage":

      return (

        <svg {...common} aria-hidden>

          <path d="M8 5c0-1.1 1.8-2 4-2s4 .9 4 2v2H8V5Z" />

          <path d="M6 9h12v2c0 3.3-2.7 6-6 6s-6-2.7-6-6V9Z" />

          <path d="M9 14h6" />

        </svg>

      );

  }

}



function SelfCheckVoiceOrb() {

  const barHeights = [

    8, 14, 22, 32, 40, 36, 28, 38, 44, 36, 24, 16, 10, 18, 26, 34, 42, 30, 20, 12,

  ];



  return (

    <div

      className="companion-selfcheck-orb"

      data-testid="companion-selfcheck-orb"

      aria-hidden

    >

      <div className="companion-selfcheck-orb-radial" />

      <div className="companion-selfcheck-orb-ring companion-selfcheck-orb-ring-outer" />

      <div className="companion-selfcheck-orb-ring companion-selfcheck-orb-ring-mid" />

      <div className="companion-selfcheck-orb-ring companion-selfcheck-orb-ring-inner" />

      <div className="companion-selfcheck-orb-scan" />

      <div className="companion-selfcheck-orb-halo" />

      <div className="companion-selfcheck-orb-core" />

      <div className="companion-selfcheck-orb-mesh" />

      <div className="companion-selfcheck-orb-wave">

        {barHeights.map((height, index) => (

          <span

            key={index}

            className="companion-selfcheck-orb-bar"

            style={{ height: `${height}px` }}

          />

        ))}

      </div>

    </div>

  );

}



function CheckIndicator({ status }: { status: BootCheckStatus }) {

  if (status === "ok") {

    return (

      <span className="companion-selfcheck-indicator companion-selfcheck-indicator-ok">

        ✓

      </span>

    );

  }

  if (status === "warn") {

    return (

      <span className="companion-selfcheck-indicator companion-selfcheck-indicator-warn">

        !

      </span>

    );

  }

  if (status === "syncing") {

    return (

      <span className="companion-selfcheck-indicator companion-selfcheck-indicator-syncing">

        <span className="h-3.5 w-3.5 animate-sync-spin rounded-full border-2 border-accent-violet border-t-transparent" />

      </span>

    );

  }

  return <span className="companion-selfcheck-indicator companion-selfcheck-indicator-pending" />;

}



function SelfCheckRow({ item }: { item: SelfCheckItem }) {

  const isActive = item.status === "syncing";

  const isDone = item.status === "ok" || item.status === "warn";

  return (

    <li

      className={[

        "companion-selfcheck-row",

        isActive ? "companion-selfcheck-row-active" : "",

        isDone ? "companion-selfcheck-row-done" : "",

        !isActive && !isDone ? "companion-selfcheck-row-pending" : "",

      ]

        .filter(Boolean)

        .join(" ")}

      data-testid={`companion-selfcheck-row-${item.id}`}

    >

      <span className="companion-selfcheck-row-icon" aria-hidden>

        <CheckItemIcon id={item.id as BootCheckId} />

      </span>

      <div className="companion-selfcheck-row-copy">

        <span className="companion-selfcheck-row-label">{item.label}</span>

        <span className="companion-selfcheck-row-sublabel">

          {SELF_CHECK_SUBLABELS[item.id as BootCheckId] ?? "SYSTEM CHECK"}

        </span>

        {item.detail && (item.status === "warn" || item.status === "syncing") ? (

          <p className="companion-selfcheck-row-detail">{item.detail}</p>

        ) : null}

      </div>

      <div className="companion-selfcheck-row-status-col">

        <CheckIndicator status={item.status} />

        <span

          className={[

            "companion-selfcheck-row-status",

            item.status === "ok"

              ? "text-accent-cyan"

              : item.status === "warn"

                ? "text-status-warn"

                : item.status === "syncing"

                  ? "text-accent-violet"

                  : "text-muted",

          ].join(" ")}

        >

          {statusLabel(item.status)}

        </span>

      </div>

    </li>

  );

}



interface CompanionSelfCheckScreenProps {

  onSkipVoice?: () => void;

}



/** V2屏 B · 语音自检 — dedicated layout per docs/V2_VISUAL_SPEC.md §3. */

export function CompanionSelfCheckScreen({

  onSkipVoice,

}: CompanionSelfCheckScreenProps) {

  const checks = useAppStore((state) => state.selfChecks);

  const bootProgress = useAppStore((state) => state.bootProgress);

  const progress =

    bootProgress > 0 ? bootProgress : computeSelfCheckProgress(checks);



  return (

    <section

      data-testid="companion-selfcheck-screen"

      className="companion-selfcheck-screen relative h-full min-h-0 overflow-hidden"

      aria-label="语音系统自检"

    >

      <SciFiAtmosphere showCorners={false} />

      <header className="companion-selfcheck-top" data-testid="companion-selfcheck-top">

        <div className="companion-selfcheck-top-brand">

          <span className="companion-selfcheck-top-kicker">系统启动序列</span>

          <h1 className="companion-selfcheck-top-title">正在初始化 Second Brain</h1>

        </div>

        <div className="companion-selfcheck-top-meta" aria-hidden>

          <span className="companion-selfcheck-top-tag">BOOT · VSC</span>

          <div className="companion-selfcheck-top-deco">

            {[12, 18, 10, 22, 14].map((height, index) => (

              <span

                key={index}

                className="companion-selfcheck-top-bar"

                style={{ height: `${height}px` }}

              />

            ))}

            <span className="companion-selfcheck-top-dot" />

          </div>

        </div>

      </header>



      <main className="companion-selfcheck-main">

        <div className="companion-selfcheck-orb-col">

          <SelfCheckVoiceOrb />

          <p className="companion-selfcheck-voice-caption">语音播报自检中…</p>

          <div className="companion-selfcheck-pulse-dots" aria-hidden>

            <span />

            <span />

            <span />

          </div>

        </div>



        <aside

          className="companion-selfcheck-panel companion-hud-panel"

          data-testid="companion-selfcheck-panel"

        >

          <div

            className="companion-selfcheck-panel-head"

            data-testid="companion-selfcheck-progress"

          >

            <span className="companion-selfcheck-panel-title">系统诊断</span>

            <span className="companion-selfcheck-panel-pct">{progress}%</span>

          </div>

          <div className="companion-selfcheck-progress-track" aria-hidden>

            <div

              className="companion-selfcheck-progress-fill"

              style={{ width: `${progress}%` }}

            />

          </div>

          <ul className="companion-selfcheck-list">

            {checks.map((item) => (

              <SelfCheckRow key={item.id} item={item} />

            ))}

          </ul>

        </aside>

      </main>



      <footer className="companion-selfcheck-bottom" data-testid="companion-selfcheck-bottom">

        <span className="font-hud text-hud-label uppercase tracking-hud text-muted">

          VSC-2025

        </span>

        <div
          className="companion-selfcheck-telemetry"
          data-testid="companion-selfcheck-telemetry"
          aria-hidden
        >
          <span className="companion-selfcheck-telemetry-item">BOOT LOG</span>
          <span className="companion-selfcheck-telemetry-sep" />
          <span className="companion-selfcheck-telemetry-item">NEURAL LINK</span>
          <span className="companion-selfcheck-telemetry-sep" />
          <span className="companion-selfcheck-telemetry-item">LOCAL CORE</span>
        </div>

        <button

          type="button"

          className="companion-selfcheck-skip sr-only focus:not-sr-only"

          onClick={onSkipVoice}

        >

          跳过语音播报

        </button>

        <span className="font-hud text-hud-label uppercase tracking-hud text-accent-cyan">

          ● NEURAL LINK STABLE

        </span>

      </footer>

    </section>

  );

}

