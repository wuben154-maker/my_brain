import { useState, type ReactNode } from "react";

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  className: "h-5 w-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.6",
  "aria-hidden": true,
} as const;

const NAV_ITEMS: NavItem[] = [
  {
    id: "graph",
    label: "知识图谱",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="5" r="2" />
        <circle cx="5" cy="18" r="2" />
        <circle cx="19" cy="18" r="2" />
        <path d="M11 7 6 16M13 7l5 9M7 18h10" />
      </svg>
    ),
  },
  {
    id: "explore",
    label: "探索",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </svg>
    ),
  },
  {
    id: "docs",
    label: "文档库",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4M9 12h6M9 16h6" />
      </svg>
    ),
  },
  {
    id: "mindmap",
    label: "思维导图",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="10" width="5" height="4" rx="1" />
        <rect x="16" y="5" width="5" height="4" rx="1" />
        <rect x="16" y="15" width="5" height="4" rx="1" />
        <path d="M8 12h4v-5h4M12 12v5h4" />
      </svg>
    ),
  },
  {
    id: "agent",
    label: "智能体",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="5" y="8" width="14" height="11" rx="2" />
        <path d="M12 8V4M9 13h.01M15 13h.01" />
      </svg>
    ),
  },
  {
    id: "insight",
    label: "分析洞察",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M5 19V5M5 19h14M9 16V9M13 16v-4M17 16v-7" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "设置",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4 12H1M23 12h-3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </svg>
    ),
  },
];

/**
 * Left icon navigation rail (DESIGN.md §7 NavRail). Visual scaffold for the
 * dashboard chrome; section routing arrives with later milestones.
 */
export function NavRail() {
  const [activeId, setActiveId] = useState("graph");

  return (
    <nav
      aria-label="主导航"
      className="flex w-16 shrink-0 flex-col items-center gap-1 border-r border-hud bg-bg-elevated/40 py-3 backdrop-blur-md"
    >
      {NAV_ITEMS.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => setActiveId(item.id)}
            className={[
              "flex w-14 flex-col items-center gap-1 rounded-md py-2 transition-[color,box-shadow,background] duration-150",
              active
                ? "border-hud-active bg-bg-panel text-accent-cyan shadow-glow-cyan"
                : "text-muted hover:bg-bg-panel/60 hover:text-secondary",
            ].join(" ")}
          >
            {item.icon}
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
