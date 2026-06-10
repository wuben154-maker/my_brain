export interface AuthoritativeFeedDefinition {
  id: string;
  label: string;
  url: string;
}

/** Stable public AI/tech feeds — no API key required. */
export const DEFAULT_AUTHORITATIVE_FEEDS: readonly AuthoritativeFeedDefinition[] = [
  {
    id: "openai-blog",
    label: "OpenAI Blog",
    url: "https://openai.com/blog/rss.xml",
  },
  {
    id: "google-ai-blog",
    label: "Google AI Blog",
    url: "https://blog.google/technology/ai/rss/",
  },
  {
    id: "anthropic-news",
    label: "Anthropic News",
    url: "https://www.anthropic.com/news/rss.xml",
  },
  {
    id: "hn-ai",
    label: "Hacker News · AI",
    url: "https://hnrss.org/newest?q=AI+LLM+agent",
  },
] as const;
