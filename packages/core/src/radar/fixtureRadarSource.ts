import type { RadarHeadline } from "./radarHeadline.js";

export const FIXTURE_RADAR_HEADLINES: RadarHeadline[] = [
  {
    id: "fixture-gh-1",
    title: "agent-framework-starter",
    summary: "占位 GitHub 项目，用于验证 star 增速筛选流程。",
    sourceUrl: "https://github.com/example/agent-framework-starter",
    sourceKind: "fixture",
    sourceId: "fixture-radar",
    publishedAt: null,
  },
  {
    id: "fixture-rss-1",
    title: "OpenAI 实时 API 更新",
    summary: "演示 RSS 信号，用于离线或无 Key 冷启动。",
    sourceUrl: "https://example.com/openai-realtime",
    sourceKind: "fixture",
    sourceId: "fixture-radar",
    publishedAt: null,
  },
  {
    id: "fixture-rss-2",
    title: "GitHub 今日星标增速",
    summary: "演示技术追踪入口。",
    sourceUrl: "https://example.com/github-trends",
    sourceKind: "fixture",
    sourceId: "fixture-radar",
    publishedAt: null,
  },
];

export function getFixtureRadarHeadlines(): RadarHeadline[] {
  return FIXTURE_RADAR_HEADLINES.map((headline) => ({ ...headline }));
}
