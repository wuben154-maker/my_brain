import type { NewsCategory, NewsFetchResult } from "@/domain/news";
import type { NewsSource } from "./types";
import { parseRssOrAtomFeed } from "./rssParser";

const ARXIV_CS_AI_URL =
  "https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=8";

/** arXiv cs.AI Atom feed — public, no API key. */
export class ArxivNewsSource implements NewsSource {
  readonly id = "arxiv-cs-ai";
  readonly label = "arXiv · cs.AI";

  async fetchLatest(): Promise<NewsFetchResult> {
    return fetchArxivCsAiLive();
  }
}

export async function fetchArxivCsAiLive(): Promise<NewsFetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(ARXIV_CS_AI_URL, {
      signal: controller.signal,
      headers: {
        Accept: "application/atom+xml, application/xml, text/xml",
        "User-Agent": "my-brain-news-fetch/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`arXiv fetch failed: HTTP ${response.status}`);
    }

    const xml = await response.text();
    const parsed = parseRssOrAtomFeed(xml, "arxiv-cs-ai").slice(0, 8);
    if (parsed.length === 0) {
      throw new Error("arXiv feed returned no entries");
    }

    return {
      sourceId: "arxiv-cs-ai",
      fetchedAt: new Date().toISOString(),
      items: parsed.map((entry) => ({
        id: entry.id,
        category: "ai_news" as NewsCategory,
        title: entry.title,
        summary: entry.summary,
        sourceName: "arXiv cs.AI",
        sourceUrl: entry.sourceUrl,
        publishedAt: entry.publishedAt,
      })),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
