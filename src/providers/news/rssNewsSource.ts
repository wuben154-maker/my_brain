import type { NewsCategory, NewsFetchResult } from "@/domain/news";
import { DEFAULT_AUTHORITATIVE_FEEDS } from "./authoritativeFeedCatalog";
import { isNewsLiveFetchEnabled } from "./newsLiveFetchMode";
import { parseRssOrAtomFeed } from "./rssParser";
import type { NewsSource } from "./types";

const DEMO_ITEMS: NewsFetchResult["items"] = [
  {
    id: "demo-rss-1",
    category: "ai_news",
    title: "示例：大模型上下文窗口继续扩展",
    summary: "占位资讯，用于验证加载动画与语音讲解流程。",
    sourceName: "Demo RSS",
    sourceUrl: "https://example.com/ai-context-window",
    publishedAt: new Date().toISOString(),
  },
];

async function fetchFeed(url: string, label: string): Promise<NewsFetchResult["items"]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        "User-Agent": "my-brain-news-fetch/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`RSS fetch failed (${label}): HTTP ${response.status}`);
    }
    const xml = await response.text();
    const parsed = parseRssOrAtomFeed(xml, label).slice(0, 5);
    return parsed.map((entry) => ({
      id: entry.id,
      category: "ai_news" as NewsCategory,
      title: entry.title,
      summary: entry.summary,
      sourceName: label,
      sourceUrl: entry.sourceUrl,
      publishedAt: entry.publishedAt,
    }));
  } finally {
    clearTimeout(timeoutId);
  }
}

/** RSS fetcher — mock demo by default; live authoritative feeds when VITE_NEWS_LIVE_FETCH=1. */
export class RssNewsSource implements NewsSource {
  readonly id = "rss-ai-feeds";
  readonly label = "AI 权威 RSS";

  constructor(
    private readonly feedUrls: string[] = DEFAULT_AUTHORITATIVE_FEEDS.map(
      (feed) => feed.url,
    ),
  ) {}

  async fetchLatest(): Promise<NewsFetchResult> {
    if (!isNewsLiveFetchEnabled()) {
      return {
        sourceId: this.id,
        fetchedAt: new Date().toISOString(),
        items: DEMO_ITEMS,
      };
    }

    const batches = await Promise.allSettled(
      this.feedUrls.map((url) => {
        const catalogFeed = DEFAULT_AUTHORITATIVE_FEEDS.find((feed) => feed.url === url);
        return fetchFeed(url, catalogFeed?.label ?? url);
      }),
    );

    const items = batches.flatMap((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      const failedUrl = this.feedUrls[index];
      const failedLabel =
        DEFAULT_AUTHORITATIVE_FEEDS.find((feed) => feed.url === failedUrl)?.label ??
        failedUrl;
      console.warn(`[RssNewsSource] feed failed: ${failedLabel}`, result.reason);
      return [];
    });

    return {
      sourceId: this.id,
      fetchedAt: new Date().toISOString(),
      items: items.length > 0 ? items : DEMO_ITEMS,
    };
  }
}

export async function fetchAuthoritativeRssLiveSmoke(): Promise<NewsFetchResult> {
  const source = new RssNewsSource();
  return source.fetchLatest();
}
