import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PROFILE } from "@/domain/profile";
import {
  generateInterviewPack,
  interviewPackMatchesGolden,
  iq1IncludesPostIngestNode,
} from "@/cognitive/generateInterviewPack";
import {
  INTERVIEW_PACK_GOLDEN,
  INTERVIEW_POST_INGEST_EXTRA_NODE_ID,
} from "@/cognitive/interviewPackGolden";
import {
  createShowcaseGraphSnapshot,
  showcaseIngestNodeFromGraph,
  SHOWCASE_GRAPH_SNAPSHOT,
} from "@/showcase/showcaseFixtures";

describe("generateInterviewPack", () => {
  it("matches INTERVIEW_PACK_GOLDEN on showcase graph", () => {
    const pack = generateInterviewPack(
      SHOWCASE_GRAPH_SNAPSHOT,
      DEFAULT_USER_PROFILE,
      { project: "my_brain" },
    );
    expect(pack.questions.length).toBeGreaterThanOrEqual(5);
    expect(pack.project).toBe("my_brain");
    expect(interviewPackMatchesGolden(pack, INTERVIEW_PACK_GOLDEN)).toBe(true);
    expect(iq1IncludesPostIngestNode(pack)).toBe(false);
  });

  it("every linkedNodeId exists in input graph", () => {
    const pack = generateInterviewPack(
      SHOWCASE_GRAPH_SNAPSHOT,
      DEFAULT_USER_PROFILE,
    );
    const nodeIds = new Set(
      SHOWCASE_GRAPH_SNAPSHOT.nodes
        .filter((node) => !node.archived)
        .map((node) => node.id),
    );
    for (const question of pack.questions) {
      expect(question.prompt.length).toBeGreaterThan(0);
      expect(question.linkedNodeIds.length).toBeGreaterThanOrEqual(1);
      for (const id of question.linkedNodeIds) {
        expect(nodeIds.has(id)).toBe(true);
      }
    }
  });

  it("iq-1 links showcase-ingest-graphiti when post-ingest node present", () => {
    const graph = createShowcaseGraphSnapshot();
    graph.nodes.push(showcaseIngestNodeFromGraph());
    const pack = generateInterviewPack(graph, DEFAULT_USER_PROFILE);
    const iq1 = pack.questions.find((q) => q.id === "iq-1");
    expect(iq1?.linkedNodeIds).toContain("demo-agent");
    expect(iq1?.linkedNodeIds).toContain(INTERVIEW_POST_INGEST_EXTRA_NODE_ID);
    expect(iq1IncludesPostIngestNode(pack)).toBe(true);
  });

  it("iq-1 stays valid when showcase-ingest-graphiti is absent", () => {
    const pack = generateInterviewPack(SHOWCASE_GRAPH_SNAPSHOT, DEFAULT_USER_PROFILE);
    const iq1 = pack.questions.find((q) => q.id === "iq-1");
    expect(iq1?.linkedNodeIds).toEqual(["demo-agent"]);
    expect(
      iq1?.linkedNodeIds.includes(INTERVIEW_POST_INGEST_EXTRA_NODE_ID),
    ).toBe(false);
  });
});
