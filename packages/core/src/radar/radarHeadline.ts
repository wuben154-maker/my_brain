export type RadarHeadlineSourceKind = "fixture" | "rss" | "github";

/** Normalized radar candidate before LLM relevance scoring. */
export interface RadarHeadline {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceKind: RadarHeadlineSourceKind;
  sourceId: string;
  publishedAt: string | null;
}
