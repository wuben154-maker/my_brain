import { describe, expect, it } from "vitest";
import { parseRssOrAtomFeed } from "./rssParser";

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss><channel>
<item>
<title>Test AI Release</title>
<link>https://example.com/ai-release</link>
<description><![CDATA[A short summary.]]></description>
<pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
</item>
</channel></rss>`;

describe("rssParser", () => {
  it("parses RSS items", () => {
    const items = parseRssOrAtomFeed(SAMPLE_RSS, "OpenAI Blog");
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Test AI Release");
    expect(items[0]?.sourceUrl).toBe("https://example.com/ai-release");
    expect(items[0]?.summary).toContain("short summary");
  });
});
