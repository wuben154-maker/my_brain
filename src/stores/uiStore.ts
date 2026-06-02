import { create } from "zustand";
import type { NavSectionId } from "@/lib/navSections";

const VALID_SECTIONS = new Set<NavSectionId>([
  "graph",
  "explore",
  "docs",
  "mindmap",
  "agent",
  "insight",
  "settings",
]);

function parseHashSection(): NavSectionId {
  if (typeof window === "undefined") {
    return "graph";
  }
  const raw = window.location.hash.replace(/^#/, "").trim();
  if (!raw || raw === "graph") {
    return "graph";
  }
  return VALID_SECTIONS.has(raw as NavSectionId)
    ? (raw as NavSectionId)
    : "graph";
}

function writeHashSection(id: NavSectionId): void {
  if (typeof window === "undefined") {
    return;
  }
  const next = id === "graph" ? "" : id;
  const current = window.location.hash.replace(/^#/, "");
  if (current === next) {
    return;
  }
  if (next) {
    window.location.hash = next;
  } else {
    history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }
}

export type GraphViewMode = "2d" | "3d";

interface UiState {
  activeSection: NavSectionId;
  graphViewMode: GraphViewMode;
  setSection: (id: NavSectionId) => void;
  setGraphViewMode: (mode: GraphViewMode) => void;
  syncFromHash: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeSection: parseHashSection(),
  graphViewMode: "2d",
  setSection: (id) => {
    set({ activeSection: id });
    writeHashSection(id);
  },
  setGraphViewMode: (mode) => set({ graphViewMode: mode }),
  syncFromHash: () => {
    set({ activeSection: parseHashSection() });
  },
}));

export function bindUiStoreHashSync(): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const onHashChange = () => {
    useUiStore.getState().syncFromHash();
  };
  window.addEventListener("hashchange", onHashChange);
  return () => window.removeEventListener("hashchange", onHashChange);
}
