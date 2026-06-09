import { describe, expect, it } from "vitest";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import {
  CURATION_REPORT_MIN_INTERVAL_MS,
  formatCurationReport,
  shouldSpeakCurationReport,
} from "@/conversation/curationReport";
import { parseIngestCommand } from "@/lib/parseIngestCommand";
import { SHOWCASE_AUTO_CURATE_GOLDEN } from "@/showcase/showcaseFixtures";

const entry: GraphHistoryEntry = {
  id: "h1",
  at: "2026-06-01T00:00:00.000Z",
  kind: "link",
  summary: "自动关联：A ↔ B",
  reasonCode: "overlap_title",
  reasonDetail: "标题重叠：「A」与「B」",
  affectedNodeIds: ["a", "b"],
  before: { nodes: [], edges: [] },
  after: { nodes: [], edges: [] },
};

describe("curationReport", () => {
  it("throttles repeated reports within the interval", () => {
    const now = 1_000_000;
    expect(shouldSpeakCurationReport(entry, 0, now)).toBe(true);
    expect(
      shouldSpeakCurationReport(
        entry,
        now - CURATION_REPORT_MIN_INTERVAL_MS + 1,
        now,
      ),
    ).toBe(false);
  });

  it("formatCurationReport returns summary for spoken line (reasonDetail is UI-only)", () => {
    expect(formatCurationReport(entry)).toBe(entry.summary);
  });

  it("formatCurationReport matches showcase golden spoken text", () => {
    const showcaseEntry: GraphHistoryEntry = {
      ...entry,
      summary: SHOWCASE_AUTO_CURATE_GOLDEN.summary,
      reasonCode: SHOWCASE_AUTO_CURATE_GOLDEN.reasonCode,
      reasonDetail: SHOWCASE_AUTO_CURATE_GOLDEN.reasonDetail,
    };
    expect(formatCurationReport(showcaseEntry)).toBe(
      "已把 Graphiti 连到 AI Agent",
    );
  });

  it("speaks at most once per interval across many entries", () => {
    const now = 1_000_000;
    let lastSpokenAt = 0;
    let spoken = 0;
    for (let i = 0; i < 5; i += 1) {
      if (shouldSpeakCurationReport(entry, lastSpokenAt, now)) {
        spoken += 1;
        lastSpokenAt = now;
      }
    }
    expect(spoken).toBe(1);
  });

  it("voice 撤销 is not parsed as ingest undo (UI/harness only)", () => {
    expect(parseIngestCommand("撤销", 1)).toEqual({ kind: "reprompt" });
    expect(parseIngestCommand("撤销", 2)).toEqual({
      kind: "command",
      command: "skip",
    });
  });
});
