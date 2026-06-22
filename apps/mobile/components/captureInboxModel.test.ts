import { describe, expect, it } from "vitest";
import {
  buildCaptureInboxVisualFixtureRows,
  captureInboxVisualFixturePendingCount,
  seedCaptureInboxVisualFixtureCandidates,
} from "./captureInboxModel";

describe("captureInboxModel visual fixture", () => {
  it("seeds eight pending rows with contract copy overrides", () => {
    const candidates = seedCaptureInboxVisualFixtureCandidates();
    expect(candidates).toHaveLength(8);
    expect(captureInboxVisualFixturePendingCount(candidates)).toBe(8);
    const rows = buildCaptureInboxVisualFixtureRows(candidates);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.title).toBe("Graphiti 的 episode 机制");
    expect(rows[0]?.sourceLabel).toBe("分享链接");
    expect(rows[1]?.timeLabel).toBe("今天 14:20");
    expect(rows[2]?.whyMaybe).toContain("先预览原图");
  });
});
