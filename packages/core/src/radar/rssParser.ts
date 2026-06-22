export interface ParsedRssItem {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  publishedAt: string | null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

function firstTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

function stripHtml(value: string): string {
  return decodeXmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

/** Minimal RSS/Atom parser — no external XML dependency; RN-safe. */
export function parseRssOrAtomFeed(xml: string, feedLabel: string): ParsedRssItem[] {
  const items: ParsedRssItem[] = [];

  if (/<entry[\s>]/i.test(xml)) {
    const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
    for (const entry of entries) {
      const title = firstTag(entry, "title");
      const link =
        entry.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? firstTag(entry, "link");
      const summary =
        stripHtml(firstTag(entry, "summary")) || stripHtml(firstTag(entry, "content"));
      const publishedAt = firstTag(entry, "updated") || firstTag(entry, "published") || null;
      if (!title || !link) {
        continue;
      }
      items.push({
        id: `${feedLabel}:${link}`,
        title,
        summary: summary || title,
        sourceUrl: link,
        publishedAt,
      });
    }
    return items;
  }

  const rssItems = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const item of rssItems) {
    const title = firstTag(item, "title");
    const link = firstTag(item, "link");
    const summary =
      stripHtml(firstTag(item, "description")) ||
      stripHtml(firstTag(item, "content:encoded"));
    const publishedAt = firstTag(item, "pubDate") || null;
    if (!title || !link) {
      continue;
    }
    items.push({
      id: `${feedLabel}:${link}`,
      title,
      summary: summary || title,
      sourceUrl: link,
      publishedAt,
    });
  }

  return items;
}
