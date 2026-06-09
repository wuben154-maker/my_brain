import { normalizeWorldItem, type WorldItem, type WorldItemKind } from "@/domain/radar/worldItem";

export type RadarFixtureCategory = "relevant" | "weak" | "noise" | "duplicate" | "stale";

export interface RadarFixtureWorldItemMetadata {
  id: string;
  category: RadarFixtureCategory;
}

export const RADAR_FIXTURE_NOW = "2026-06-01T08:00:00.000Z";
export const RADAR_SHOWCASE_NOW = "2026-06-01T12:00:00.000Z";
export const RADAR_STALE_FETCHED_AT = "2026-05-28T08:00:00.000Z";

export const RADAR_ACTIVE_GOLDEN_COUNT = 14;
export const RADAR_DUPLICATE_GOLDEN_COUNT = 2;

export const RADAR_FIXTURE_CATEGORY_COUNTS: Record<RadarFixtureCategory, number> = {
  relevant: 5,
  weak: 4,
  noise: 4,
  duplicate: 3,
  stale: 4,
};

export const RADAR_FIXTURE_WORLD_ITEM_CATEGORIES: RadarFixtureWorldItemMetadata[] = [
  { id: "radar-wi-rel-1", category: "relevant" },
  { id: "radar-wi-rel-2", category: "relevant" },
  { id: "radar-wi-rel-3", category: "relevant" },
  { id: "radar-wi-rel-4", category: "relevant" },
  { id: "radar-wi-rel-5", category: "relevant" },
  { id: "radar-wi-weak-1", category: "weak" },
  { id: "radar-wi-weak-2", category: "weak" },
  { id: "radar-wi-weak-3", category: "weak" },
  { id: "radar-wi-weak-4", category: "weak" },
  { id: "radar-wi-noise-1", category: "noise" },
  { id: "radar-wi-noise-2", category: "noise" },
  { id: "radar-wi-noise-3", category: "noise" },
  { id: "radar-wi-noise-4", category: "noise" },
  { id: "radar-wi-dup-1", category: "duplicate" },
  { id: "radar-wi-dup-2", category: "duplicate" },
  { id: "radar-wi-dup-3", category: "duplicate" },
  { id: "radar-wi-stale-1", category: "stale" },
  { id: "radar-wi-stale-2", category: "stale" },
  { id: "radar-wi-stale-3", category: "stale" },
  { id: "radar-wi-stale-4", category: "stale" },
];

export const RADAR_FIXTURE_WORLD_ITEMS: WorldItem[] = [
  wi(
    "radar-wi-rel-1",
    "ai_news",
    "Realtime API adds native interruption controls",
    "OpenAI Realtime strengthens speech-to-speech barge-in for companion agents.",
    "https://example.com/realtime-interruptions",
    "Mock AI Radar",
  ),
  wi(
    "radar-wi-rel-2",
    "github_trending",
    "mcp-agent-router",
    "GitHub project routes agent tools through Model Context Protocol adapters.",
    "https://github.com/example/mcp-agent-router",
    "GitHub Trending",
  ),
  wi(
    "radar-wi-rel-3",
    "blog",
    "Graph memory systems for personal AI",
    "A practitioner write-up compares temporal knowledge graphs for personal assistants.",
    "https://example.com/graph-memory-systems",
    "Mock Blog",
  ),
  wi(
    "radar-wi-rel-4",
    "release",
    "VoiceProvider SDK ships session handoff hooks",
    "The release adds provider boundaries useful for swapping mock and realtime voice.",
    "https://example.com/voiceprovider-session-hooks",
    "Mock Release Notes",
  ),
  wi(
    "radar-wi-rel-5",
    "rss",
    "Local-first AI apps revisit SQLite sync",
    "Teams are using local SQLite as the default data plane for privacy-heavy AI apps.",
    "https://example.com/local-first-sqlite-ai",
    "Mock RSS",
  ),
  wi(
    "radar-wi-weak-1",
    "ai_news",
    "Long-context evals add multilingual prompts",
    "Benchmark maintainers add Chinese explanations and longer document tasks.",
    "https://example.com/long-context-multilingual",
    "Mock AI Radar",
  ),
  wi(
    "radar-wi-weak-2",
    "github_trending",
    "desktop-ai-shell",
    "A Tauri desktop shell demonstrates provider toggles for local AI tools.",
    "https://github.com/example/desktop-ai-shell",
    "GitHub Trending",
  ),
  wi(
    "radar-wi-weak-3",
    "blog",
    "Design notes on ambient companion UIs",
    "A design essay covers voice-first companion surfaces and low-chrome settings.",
    "https://example.com/ambient-companion-ui",
    "Mock Blog",
  ),
  wi(
    "radar-wi-weak-4",
    "rss",
    "Knowledge graph visualization libraries compared",
    "A short survey compares force-directed graph libraries for concept maps.",
    "https://example.com/kg-viz-libraries",
    "Mock RSS",
  ),
  wi(
    "radar-wi-noise-1",
    "rss",
    "GPU market pricing update",
    "A hardware channel tracks retail GPU price changes for gaming rigs.",
    "https://example.com/gpu-market-update",
    "Noise RSS",
  ),
  wi(
    "radar-wi-noise-2",
    "blog",
    "CSS container queries cookbook",
    "Frontend recipes for responsive cards and editorial layouts.",
    "https://example.com/css-container-cookbook",
    "Noise Blog",
  ),
  wi(
    "radar-wi-noise-3",
    "release",
    "Database driver patch release",
    "A patch release fixes connection pooling edge cases in a legacy driver.",
    "https://example.com/db-driver-patch",
    "Noise Release Notes",
  ),
  wi(
    "radar-wi-noise-4",
    "github_trending",
    "retro-terminal-theme",
    "A terminal theme repository trends after adding new color palettes.",
    "https://github.com/example/retro-terminal-theme",
    "GitHub Trending",
  ),
  wi(
    "radar-wi-dup-1",
    "ai_news",
    "Agent memory benchmark publishes graph recall tasks",
    "The benchmark evaluates whether agents can recall linked concepts over sessions.",
    "https://example.com/agent-memory-benchmark",
    "Mock AI Radar",
  ),
  wi(
    "radar-wi-dup-2",
    "ai_news",
    "Agent memory benchmark mirror",
    "A syndication copy points to the same graph recall benchmark announcement.",
    "https://example.com/agent-memory-benchmark",
    "Mock AI Radar Mirror",
  ),
  wi(
    "radar-wi-dup-3",
    "ai_news",
    "Agent memory benchmark publishes graph recall tasks",
    "The benchmark evaluates whether agents can recall linked concepts over sessions.",
    "https://example.com/agent-memory-benchmark",
    "Mock AI Radar Copy",
  ),
  wi(
    "radar-wi-stale-1",
    "ai_news",
    "Old agent framework release from May",
    "A stale announcement predates the current radar window.",
    "https://example.com/stale-agent-framework",
    "Stale RSS",
    RADAR_STALE_FETCHED_AT,
  ),
  wi(
    "radar-wi-stale-2",
    "github_trending",
    "last-week-voice-demo",
    "A repo that trended before the current 72 hour radar window.",
    "https://github.com/example/last-week-voice-demo",
    "Stale GitHub Trending",
    RADAR_STALE_FETCHED_AT,
  ),
  wi(
    "radar-wi-stale-3",
    "blog",
    "Archived notes on prompt libraries",
    "An older blog post about prompt snippets that should not remain active.",
    "https://example.com/stale-prompt-libraries",
    "Stale Blog",
    RADAR_STALE_FETCHED_AT,
  ),
  wi(
    "radar-wi-stale-4",
    "release",
    "Superseded MCP draft release",
    "An old draft release has been replaced by newer MCP adapter guidance.",
    "https://example.com/stale-mcp-draft",
    "Stale Release Notes",
    RADAR_STALE_FETCHED_AT,
  ),
];

export const fixtureWorldSource = {
  id: "fixture-world-source",
  label: "Fixture World Source",
  async fetchWorldItems(): Promise<WorldItem[]> {
    return RADAR_FIXTURE_WORLD_ITEMS.map((item) => ({ ...item }));
  },
};

function wi(
  id: string,
  kind: WorldItemKind,
  title: string,
  summary: string,
  sourceUrl: string,
  sourceName: string,
  fetchedAt: string = RADAR_FIXTURE_NOW,
): WorldItem {
  return normalizeWorldItem({
    id,
    kind,
    title,
    summary,
    sourceUrl,
    sourceName,
    fetchedAt,
  });
}
