import { describe, expect, it } from "vitest";
import {
  addWorldItemTtl,
  getWorldItemDedupeKey,
  getWorldItemValidationErrors,
  hashWorldItemContent,
  isWorldItem,
  isWorldItemExpired,
  normalizeSourceUrl,
  normalizeWorldItem,
  WORLD_ITEM_DEFAULT_TTL_MS,
} from "@/domain/radar/worldItem";

describe("WorldItem model", () => {
  it("normalizes timestamps, URL, hash, status, and default TTL", () => {
    const item = normalizeWorldItem({
      id: " radar-wi-test ",
      kind: "ai_news",
      title: "  Realtime API  ",
      summary: "  Barge-in support  ",
      sourceUrl: "HTTPS://Example.com:443/realtime#section",
      fetchedAt: "2026-06-01T08:00:00.000Z",
    });

    expect(item.id).toBe("radar-wi-test");
    expect(item.title).toBe("Realtime API");
    expect(item.summary).toBe("Barge-in support");
    expect(item.sourceUrl).toBe("https://example.com/realtime");
    expect(item.status).toBe("active");
    expect(item.duplicateOf).toBeNull();
    expect(item.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(item.expiresAt).toBe("2026-06-04T08:00:00.000Z");
    expect(isWorldItem(item)).toBe(true);
  });

  it("computes deterministic content hashes from normalized content", () => {
    const first = hashWorldItemContent(" Title ", " Summary ", "https://example.com/a#ref");
    const second = hashWorldItemContent("Title", "Summary", "https://example.com/a");

    expect(first).toBe(second);
    expect(first).toBe("5df9bc66a069720beaa40065a4bf5feb716e57ab3f88c23271e7cbff89d963a9");
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it("exports TTL and expiry helpers", () => {
    expect(WORLD_ITEM_DEFAULT_TTL_MS).toBe(72 * 60 * 60 * 1000);
    expect(addWorldItemTtl("2026-06-01T08:00:00.000Z")).toBe(
      "2026-06-04T08:00:00.000Z",
    );
    expect(
      isWorldItemExpired(
        { expiresAt: "2026-06-01T11:59:59.999Z" },
        "2026-06-01T12:00:00.000Z",
      ),
    ).toBe(true);
  });

  it("builds dedupe keys from canonical URL and content hash", () => {
    const item = normalizeWorldItem({
      id: "radar-wi-key",
      kind: "rss",
      title: "Title",
      summary: "Summary",
      sourceUrl: "https://example.com/key#ignored",
      fetchedAt: "2026-06-01T08:00:00.000Z",
    });

    expect(getWorldItemDedupeKey(item)).toEqual({
      canonicalUrl: "https://example.com/key",
      contentHash: item.contentHash,
    });
    expect(normalizeSourceUrl(" ")).toBeNull();
  });

  it("reports validation errors for malformed values", () => {
    expect(
      getWorldItemValidationErrors({
        id: "",
        kind: "video",
        title: "Bad",
        summary: "Bad",
        sourceUrl: 1,
        contentHash: "not-a-hash",
        fetchedAt: "nope",
        expiresAt: "also-nope",
        status: "deleted",
        duplicateOf: 42,
      }),
    ).toEqual([
      "id must be a non-empty string",
      "kind must be a valid WorldItemKind",
      "sourceUrl must be string or null",
      "fetchedAt must be a valid ISO timestamp",
      "expiresAt must be a valid ISO timestamp",
      "status must be a valid WorldItemStatus",
      "duplicateOf must be string or null",
      "contentHash must be a lowercase SHA-256 hex string",
    ]);
  });
});
