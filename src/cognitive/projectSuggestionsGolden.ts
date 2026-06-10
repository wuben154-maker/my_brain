import type { CognitiveActionKind } from "@/domain/actions/cognitiveAction";
import { RADAR_RANKING_GOLDEN } from "@/radar/radarRankingGolden";
import { SHOWCASE_INGEST_NODE_ID, SHOWCASE_PROJECT_MCP_ID, SHOWCASE_PROJECT_VOICE_ID } from "@/showcase/showcaseFixtures";

/** Primary B3 trend fixture referenced by pa-1 golden. */
export const PROJECT_SUGGESTION_TREND_FIXTURE_ID = RADAR_RANKING_GOLDEN.top3Ids[0];

export interface ProjectSuggestionGoldenEntry {
  id: string;
  kind: CognitiveActionKind;
  linkedNodeIds: string[];
  /** At least one real Project node id when graph includes KP-08 projects. */
  linkedProjectIds?: string[];
  /** At least one node title substring must appear in reason. */
  reasonTitleAnchors: string[];
  reasonTrendAnchors: string[];
  titlePrefix: string;
  optionalGraphitiNodeId?: string;
}

export const PROJECT_SUGGESTIONS_GOLDEN: ProjectSuggestionGoldenEntry[] = [
  {
    id: "pa-1",
    kind: "project_issue",
    linkedNodeIds: ["demo-agent", SHOWCASE_INGEST_NODE_ID],
    linkedProjectIds: [SHOWCASE_PROJECT_VOICE_ID],
    optionalGraphitiNodeId: SHOWCASE_INGEST_NODE_ID,
    reasonTitleAnchors: ["Graphiti", "AI Agent", "沉浸式语音伴侣"],
    reasonTrendAnchors: [
      PROJECT_SUGGESTION_TREND_FIXTURE_ID,
      "Realtime API adds native interruption controls",
      "voice",
    ],
    titlePrefix: "Issue 草稿",
  },
  {
    id: "pa-2",
    kind: "roadmap",
    linkedNodeIds: ["demo-mcp", "demo-agent"],
    linkedProjectIds: [SHOWCASE_PROJECT_MCP_ID],
    reasonTitleAnchors: ["MCP", "AI Agent", "Brain MCP 只读"],
    reasonTrendAnchors: ["Brain MCP", "只读"],
    titlePrefix: "Roadmap 草稿",
  },
];
