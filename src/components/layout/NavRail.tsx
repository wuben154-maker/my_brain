import type { ReactNode } from "react";
import { NAV_SECTIONS, type NavSectionId } from "@/lib/navSections";
import { useUiStore } from "@/stores/uiStore";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  className: "h-5 w-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.6",
  "aria-hidden": true,
} as const;

const NAV_ICONS: Record<NavSectionId, ReactNode> = {
  graph: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="5" r="2" />
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M11 7 6 16M13 7l5 9M7 18h10" />
    </svg>
  ),
  explore: (
    <svg {...ICON_PROPS}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  ),
  docs: (
    <svg {...ICON_PROPS}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  ),
  mindmap: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="10" width="5" height="4" rx="1" />
      <rect x="16" y="5" width="5" height="4" rx="1" />
      <rect x="16" y="15" width="5" height="4" rx="1" />
      <path d="M8 12h4v-5h4M12 12v5h4" />
    </svg>
  ),
  agent: (
    <svg {...ICON_PROPS}>
      <rect x="5" y="8" width="14" height="11" rx="2" />
      <path d="M12 8V4M9 13h.01M15 13h.01" />
    </svg>
  ),
  insight: (
    <svg {...ICON_PROPS}>
      <path d="M5 19V5M5 19h14M9 16V9M13 16v-4M17 16v-7" />
    </svg>
  ),
  settings: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4 12H1M23 12h-3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </svg>
  ),
};

/**
 * Left icon navigation rail (DESIGN.md §7 NavRail). Section routing via uiStore (N0).
 */
export function NavRail() {
  const activeSection = useUiStore((state) => state.activeSection);
  const setSection = useUiStore((state) => state.setSection);

  return (
    <nav
      aria-label="主导航"
      className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-hud bg-bg-elevated/40 py-3 backdrop-blur-md"
    >
      {NAV_SECTIONS.map((item) => {
        const active = item.id === activeSection;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => setSection(item.id)}
            className={[
              "flex w-14 flex-col items-center gap-1 rounded-md py-2 transition-[color,box-shadow,background] duration-150",
              active
                ? "border-hud-active bg-bg-panel text-accent-cyan shadow-glow-cyan"
                : "text-muted hover:bg-bg-panel/60 hover:text-secondary",
            ].join(" ")}
          >
            {NAV_ICONS[item.id]}
            <span className="font-hud text-[0.5625rem] leading-none tracking-hud">
              {item.label}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        aria-label="折叠导航"
        className="mt-auto flex h-8 w-8 items-center justify-center rounded-md text-muted hover:text-secondary"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
      </button>
    </nav>
  );
}
