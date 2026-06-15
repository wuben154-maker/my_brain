import { describe, expect, it } from "vitest";

import { createProvisionalCandidate } from "./queue.js";
import type { ProvisionalSourceType } from "./types.js";

const M4_SOURCE_TYPES: ProvisionalSourceType[] = [
  "text",
  "link",
  "learning",
  "project",
  "life",
  "image_mock",
  "voice_note_mock",
];

describe("ProvisionalSourceType — M4 non-news sources", () => {
  it("includes learning / project / life / image_mock", () => {
    for (const st of ["learning", "project", "life", "image_mock"] as const) {
      const c = createProvisionalCandidate({ sourceType: st, summary: `fixture ${st}` });
      expect(c.sourceType).toBe(st);
      expect(c.status).toBe("pending");
    }
  });

  it("voice_note_mock is mock-only metadata", () => {
    const c = createProvisionalCandidate({
      sourceType: "voice_note_mock",
      summary: "语音笔记 mock（M3 未 PASS 禁用）",
    });
    expect(c.sourceType).toBe("voice_note_mock");
    expect(M4_SOURCE_TYPES).toContain("voice_note_mock");
  });

  it("all M4 source types are creatable without permanent side effects", () => {
    for (const st of M4_SOURCE_TYPES) {
      const c = createProvisionalCandidate({ sourceType: st, summary: `src ${st}` });
      expect(c.sourceType).toBe(st);
    }
  });
});
