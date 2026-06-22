import { RadarFetchError, type RadarFetch } from "./radarFetch.js";
import type { RadarHeadline } from "./radarHeadline.js";
import { parseRssOrAtomFeed } from "./rssParser.js";

export const RSS_RADAR_SOURCE_ID = "rss-ai-feed";

export const DEFAULT_AI_RSS_FEED_URL = "https://hnrss.org/newest?q=AI+LLM+agent";

export async function fetchRssRadarHeadlines(
  radarFetch: RadarFetch,
  feedUrl: string = DEFAULT_AI_RSS_FEED_URL,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<RadarHeadline[]> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal ?? controller.signal;

  try {
    const response = await radarFetch(feedUrl, {
      signal,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      throw new RadarFetchError(
        "HTTP_ERROR",
        `RSS fetch failed: HTTP ${response.status}`,
        response.status,
      );
    }

    const xml = await response.text();
    if (!xml.trim()) {
      throw new RadarFetchError("EMPTY_RESPONSE", "RSS feed returned empty body");
    }

    const parsed = parseRssOrAtomFeed(xml, feedUrl);
    if (parsed.length === 0) {
      throw new RadarFetchError("PARSE_ERROR", "RSS feed contained no parseable items");
    }

    return parsed.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      sourceUrl: item.sourceUrl,
      sourceKind: "rss" as const,
      sourceId: RSS_RADAR_SOURCE_ID,
      publishedAt: item.publishedAt,
    }));
  } catch (error) {
    if (error instanceof RadarFetchError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new RadarFetchError("NETWORK_ERROR", "RSS fetch timed out");
    }
    throw new RadarFetchError(
      "NETWORK_ERROR",
      error instanceof Error ? error.message : "RSS network failure",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
