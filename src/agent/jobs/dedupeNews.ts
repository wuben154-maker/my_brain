import type { BrainGraphSnapshot } from "@/domain/graph";
import type { NewsItem } from "@/domain/news";

/** Normalize titles for exact-match dedupe (fuzzy similarity is a later enhancement). */
export function normalizeNewsTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeSourceUrl(url: string): string {
  return url.trim().toLowerCase();
}

/**
 * Drop news already represented in the graph — by sourceUrl or normalized title.
 * Prefer under-ingest over duplicate nodes; user can reject bad proposals.
 */
export function dedupeAgainstGraph(
  news: NewsItem[],
  graph: BrainGraphSnapshot,
): NewsItem[] {
  const graphUrls = new Set(
    graph.nodes
      .map((node) => node.sourceUrl)
      .filter((url): url is string => url != null && url.length > 0)
      .map(normalizeSourceUrl),
  );
  const graphTitles = new Set(
    graph.nodes.map((node) => normalizeNewsTitle(node.title)),
  );

  return news.filter((item) => {
    if (graphUrls.has(normalizeSourceUrl(item.sourceUrl))) {
      return false;
    }
    if (graphTitles.has(normalizeNewsTitle(item.title))) {
      return false;
    }
    return true;
  });
}
