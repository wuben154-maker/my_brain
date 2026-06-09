import type { NewsSource, NewsSourceRegistry } from "@/providers/news/types";
import { createWorldItemStore, type WorldItemStore } from "@/domain/radar/worldItemStore";
import type { WorldItem } from "@/domain/radar/worldItem";
import {
  fixtureWorldSource,
  RADAR_SHOWCASE_NOW,
} from "@/radar/worldSources/fixtureWorldSource";
import {
  mapNewsFetchResultToWorldItems,
  mapNewsResultsToWorldItems,
} from "@/radar/worldSources/worldSourceAdapter";

export interface WorldSource {
  readonly id: string;
  readonly label: string;
  fetchWorldItems(): Promise<WorldItem[]>;
}

export type RunWorldIngestSource = "fixture" | WorldSource | NewsSource | NewsSourceRegistry;

export interface RunWorldIngestOptions {
  source?: RunWorldIngestSource;
  store?: WorldItemStore;
  now?: string;
  fallbackToFixture?: boolean;
  warn?: (message: string) => void;
}

export interface RunWorldIngestResult {
  store: WorldItemStore;
  fetchedItems: WorldItem[];
  activeItems: WorldItem[];
  expiredItems: WorldItem[];
  warnings: string[];
}

export async function runWorldIngest(
  options: RunWorldIngestOptions = {},
): Promise<RunWorldIngestResult> {
  const store = options.store ?? createWorldItemStore();
  const now = options.now ?? RADAR_SHOWCASE_NOW;
  const fallbackToFixture = options.fallbackToFixture ?? true;
  const warnings: string[] = [];
  const warn = (message: string) => {
    warnings.push(message);
    options.warn?.(message);
  };

  let fetchedItems: WorldItem[];
  try {
    fetchedItems = await fetchWorldItems(options.source ?? "fixture");
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown source failure";
    warn(`World ingest source failed: ${message}`);
    if (!fallbackToFixture) {
      fetchedItems = [];
    } else {
      warn("World ingest falling back to fixture source");
      fetchedItems = await fixtureWorldSource.fetchWorldItems();
    }
  }

  store.upsertMany(fetchedItems);
  const expiredItems = store.expire(now);

  return {
    store,
    fetchedItems,
    activeItems: store.listActive(),
    expiredItems,
    warnings,
  };
}

async function fetchWorldItems(source: RunWorldIngestSource): Promise<WorldItem[]> {
  if (source === "fixture") {
    return fixtureWorldSource.fetchWorldItems();
  }
  if (isWorldSource(source)) {
    return source.fetchWorldItems();
  }
  if (isNewsSourceRegistry(source)) {
    return mapNewsResultsToWorldItems(await source.fetchAll());
  }
  return mapNewsFetchResultToWorldItems(await source.fetchLatest());
}

function isWorldSource(source: Exclude<RunWorldIngestSource, "fixture">): source is WorldSource {
  return "fetchWorldItems" in source;
}

function isNewsSourceRegistry(
  source: Exclude<RunWorldIngestSource, "fixture">,
): source is NewsSourceRegistry {
  return "fetchAll" in source;
}
