import { persistGraphSnapshot } from "@/lib/graphMutations";
import type { NewsItem } from "@/domain/news";
import type { StorageProvider } from "@/storage/types";
import {
  createShowcaseGraphSnapshot,
  SHOWCASE_BRIEFING_ITEMS,
  SHOWCASE_PROFILE,
} from "@/showcase/showcaseFixtures";

const SHOWCASE_QUERY_KEY = "showcase";
const SHOWCASE_ENV_KEY = "VITE_SHOWCASE_DEMO";

function readShowcaseQueryFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const value = new URLSearchParams(window.location.search).get(
    SHOWCASE_QUERY_KEY,
  );
  return value === "1" || value === "true";
}

function readShowcaseEnvFlag(): boolean {
  const raw = import.meta.env[SHOWCASE_ENV_KEY];
  if (raw === true || raw === "true" || raw === "1") {
    return true;
  }
  if (typeof process !== "undefined" && process.env?.[SHOWCASE_ENV_KEY] === "1") {
    return true;
  }
  return false;
}

/** True when explicit showcase demo is requested (`?showcase=1` or `VITE_SHOWCASE_DEMO=1`). */
export function isShowcaseDemoMode(): boolean {
  return readShowcaseQueryFlag() || readShowcaseEnvFlag();
}

/** Showcase news queue — fixed three briefing items, no network fetch. */
export function getShowcaseNewsQueue(): NewsItem[] {
  return [...SHOWCASE_BRIEFING_ITEMS];
}

export function getShowcaseProfile() {
  return { ...SHOWCASE_PROFILE };
}

/** Seed storage + in-memory graph with the showcase snapshot. */
export async function bootstrapShowcaseGraph(
  storage: StorageProvider,
): Promise<void> {
  const snapshot = createShowcaseGraphSnapshot();
  await persistGraphSnapshot(storage, { nodes: [], edges: [] }, snapshot);
}
