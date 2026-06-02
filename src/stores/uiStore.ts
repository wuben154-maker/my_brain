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

interface UiState {
  activeSection: NavSectionId;
  setSection: (id: NavSectionId) => void;
  syncFromHash: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeSection: parseHashSection(),
  setSection: (id) => {
    set({ activeSection: id });
    writeHashSection(id);
  },
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
