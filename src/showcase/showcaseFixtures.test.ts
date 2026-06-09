import { describe, expect, it } from "vitest";
import { readCreatePayload } from "@/domain/graphMutationPayloads";
import {
  SHOWCASE_AUTO_CURATE_GOLDEN,
  SHOWCASE_BRIEFING_ITEMS,
  SHOWCASE_DESIGNATED_INGEST_BRIEF_ID,
  SHOWCASE_GRAPH_SNAPSHOT,
  SHOWCASE_INGEST_CANDIDATE,
  SHOWCASE_NOW,
  SHOWCASE_PERSONA_ID,
  SHOWCASE_PROFILE,
  SHOWCASE_VOICE_SCRIPT,
  buildShowcaseIngestCreateProposal,
  countShowcaseVisibleNodes,
  createShowcaseGraphSnapshot,
} from "@/showcase/showcaseFixtures";
import { visibleGraph } from "@/lib/graphMutations";

describe("showcaseFixtures", () => {
  it("exports stable graph snapshot with frozen timestamp", () => {
    expect(SHOWCASE_GRAPH_SNAPSHOT.nodes).toHaveLength(7);
    expect(SHOWCASE_GRAPH_SNAPSHOT.edges).toHaveLength(5);
    for (const node of SHOWCASE_GRAPH_SNAPSHOT.nodes) {
      expect(node.createdAt).toBe(SHOWCASE_NOW);
      expect(node.updatedAt).toBe(SHOWCASE_NOW);
    }
    expect(JSON.stringify(SHOWCASE_GRAPH_SNAPSHOT)).toMatchSnapshot();
  });

  it("round-trips graph snapshot via structuredClone factory", () => {
    const clone = createShowcaseGraphSnapshot();
    expect(clone).toEqual(SHOWCASE_GRAPH_SNAPSHOT);
    expect(clone).not.toBe(SHOWCASE_GRAPH_SNAPSHOT);
  });

  it("exposes six visible nodes (demo-bert archived)", () => {
    expect(countShowcaseVisibleNodes()).toBe(6);
    const bert = SHOWCASE_GRAPH_SNAPSHOT.nodes.find((n) => n.id === "demo-bert");
    expect(bert?.archived).toBe(true);
    expect(visibleGraph(SHOWCASE_GRAPH_SNAPSHOT).nodes.map((n) => n.id)).not.toContain(
      "demo-bert",
    );
  });

  it("defines three briefing items in fixed order", () => {
    expect(SHOWCASE_BRIEFING_ITEMS).toHaveLength(3);
    expect(SHOWCASE_BRIEFING_ITEMS.map((item) => item.id)).toEqual([
      "showcase-brief-1",
      "showcase-brief-2",
      "showcase-brief-3",
    ]);
    expect(JSON.stringify(SHOWCASE_BRIEFING_ITEMS)).toMatchSnapshot();
  });

  it("designates showcase-brief-3 as the only ingest candidate", () => {
    expect(SHOWCASE_DESIGNATED_INGEST_BRIEF_ID).toBe("showcase-brief-3");
    expect(SHOWCASE_INGEST_CANDIDATE.briefId).toBe("showcase-brief-3");
    expect(SHOWCASE_INGEST_CANDIDATE.title).toBe("Graphiti");
    expect(SHOWCASE_INGEST_CANDIDATE.intro).not.toBe(
      SHOWCASE_BRIEFING_ITEMS[2]!.title,
    );
    expect(SHOWCASE_INGEST_CANDIDATE.intro).not.toBe(
      SHOWCASE_BRIEFING_ITEMS[2]!.summary,
    );
  });

  it("builds create proposal with explicit showcase node id", () => {
    const proposal = buildShowcaseIngestCreateProposal();
    expect(proposal.kind).toBe("create");
    const payload = readCreatePayload(proposal.payload);
    expect(payload.id).toBe("showcase-ingest-graphiti");
    expect(payload.title).toBe(SHOWCASE_INGEST_CANDIDATE.title);
    expect(payload.sourceUrl).toBe(SHOWCASE_INGEST_CANDIDATE.sourceUrl);
  });

  it("exports auto-curate golden and voice script constants", () => {
    expect(SHOWCASE_AUTO_CURATE_GOLDEN).toMatchObject({
      kind: "link",
      sourceId: "showcase-ingest-graphiti",
      targetId: "demo-agent",
      reasonCode: "ingest_link",
    });
    expect(SHOWCASE_VOICE_SCRIPT.filter((s) => s.kind === "ingest_parse")).toHaveLength(
      4,
    );
    expect(SHOWCASE_PROFILE.persona).toBe(SHOWCASE_PERSONA_ID);
  });
});
