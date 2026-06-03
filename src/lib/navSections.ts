export type NavSectionId =
  | "graph"
  | "explore"
  | "docs"
  | "mindmap"
  | "agent"
  | "insight"
  | "settings";

export interface NavSectionDef {
  id: NavSectionId;
  label: string;
  status: "live" | "planned";
  specRef: string | null;
}

/** Single source of truth for NavRail order and section metadata (N0). */
export const NAV_SECTIONS: NavSectionDef[] = [
  {
    id: "graph",
    label: "知识图谱",
    status: "live",
    specRef: null,
  },
  {
    id: "explore",
    label: "探索",
    status: "live",
    specRef: null,
  },
  {
    id: "docs",
    label: "文档库",
    status: "live",
    specRef: null,
  },
  {
    id: "mindmap",
    label: "思维导图",
    status: "planned",
    specRef: "specs/N3-mindmap-view.md",
  },
  {
    id: "agent",
    label: "智能体",
    status: "live",
    specRef: null,
  },
  {
    id: "insight",
    label: "分析洞察",
    status: "live",
    specRef: "specs/B3-research-trace-view.md",
  },
  {
    id: "settings",
    label: "设置",
    status: "live",
    specRef: null,
  },
];

export function getNavSection(id: NavSectionId): NavSectionDef {
  const section = NAV_SECTIONS.find((entry) => entry.id === id);
  if (!section) {
    throw new Error(`Unknown nav section: ${id}`);
  }
  return section;
}
