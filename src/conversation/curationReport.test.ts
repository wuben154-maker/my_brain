import { describe, expect, it } from "vitest";
import type { GraphHistoryEntry } from "@/domain/graphHistory";
import {
  CURATION_REPORT_MIN_INTERVAL_MS,
  formatCurationReport,
  shouldSpeakCurationReport,
} from "@/conversation/curationReport";

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

  it("formatCurationReport appends reasonDetail after summary when non-empty", () => {
    expect(formatCurationReport(entry)).toBe(
      `${entry.summary}：${entry.reasonDetail}`,
    );
  });

  it("formatCurationReport returns summary only when reasonDetail is empty", () => {
    expect(
      formatCurationReport({
        ...entry,
        reasonDetail: "",
      }),
    ).toBe(entry.summary);
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
});
