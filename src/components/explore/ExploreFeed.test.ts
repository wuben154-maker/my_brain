/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewsItem } from "@/domain/news";
import { ExploreFeed } from "@/components/explore/ExploreFeed";
import { useAppStore } from "@/stores/appStore";
import { useIngestStore } from "@/stores/ingestStore";

const sampleNews: NewsItem[] = [
  {
    id: "news-1",
    category: "ai_news",
    title: "测试资讯 A",
    summary: "摘要 A",
    sourceName: "RSS",
    sourceUrl: "https://example.com/a",
    publishedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "news-2",
    category: "github_trending",
    title: "测试资讯 B",
    summary: "摘要 B",
    sourceName: "GitHub",
    sourceUrl: "https://github.com/x",
    publishedAt: null,
  },
];

vi.mock("@/hooks/useNewsIngestSession", () => ({
  useNewsIngestSession: vi.fn(),
}));

import { useNewsIngestSession } from "@/hooks/useNewsIngestSession";

describe("ExploreFeed (N1)", () => {
  const skipCurrent = vi.fn();
  const requestIngest = vi.fn();

  beforeEach(() => {
    useAppStore.setState({
      phase: "companion",
      newsQueue: sampleNews,
    } as Partial<ReturnType<typeof useAppStore.getState>>);
    useIngestStore.getState().reset();
    vi.mocked(useNewsIngestSession).mockReturnValue({
      currentItem: sampleNews[0],
      ingestPhase: "awaiting_ingest",
      explanation: "",
      pendingProposal: null,
      errorMessage: null,
      sessionComplete: false,
      isActive: true,
      explainCurrent: vi.fn(),
      requestIngest,
      confirmProposal: vi.fn(),
      rejectProposal: vi.fn(),
      skipCurrent,
      declineIngest: skipCurrent,
      processedCount: 0,
      totalCount: 2,
    });
  });

  afterEach(() => {
    cleanup();
    useIngestStore.getState().reset();
    vi.clearAllMocks();
  });

  it("lists all newsQueue items with pending status", () => {
    render(createElement(ExploreFeed));
    expect(screen.getByTestId("news-card-news-1")).toBeTruthy();
    expect(screen.getByTestId("news-card-news-2")).toBeTruthy();
    expect(screen.getByTestId("news-card-status-news-1").textContent).toBe(
      "待处理",
    );
  });

  it("shows ingested label after markIngested", () => {
    useIngestStore.getState().markIngested("news-1");
    render(createElement(ExploreFeed));
    expect(screen.getByTestId("news-card-status-news-1").textContent).toBe(
      "已入库",
    );
  });

  it("calls requestIngest after focusing item", () => {
    render(createElement(ExploreFeed));
    const cards = screen.getAllByRole("button", { name: "入库?" });
    cards[1]?.click();
    expect(useIngestStore.getState().activeNewsId).toBe("news-2");
    expect(requestIngest).toHaveBeenCalled();
  });

  it("marks skipped without ingest", () => {
    render(createElement(ExploreFeed));
    const skipButtons = screen.getAllByRole("button", { name: "跳过" });
    skipButtons[1]?.click();
    expect(useIngestStore.getState().skippedIds).toContain("news-2");
  });
});
