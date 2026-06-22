import { describe, expect, it } from "vitest";

import type { UserModeProfile } from "../domain/userMode.js";
import { buildEvidenceBundle } from "./evidence.js";
import { buildReverseQuestion } from "./reverseQuestion.js";

const profile: UserModeProfile = {
  primaryMode: "personal_memory",
  secondaryModes: [],
  confidence: 0.8,
};

describe("reverseQuestionEvidence", () => {
  it("hides when graph has no visible nodes", () => {
    const result = buildReverseQuestion(profile, buildEvidenceBundle({}));
    expect(result.visible).toBe(false);
    expect(result.prompt).toBe("");
    expect(result.evidenceRefs).toHaveLength(0);
  });

  it("requires evidenceRefs when nodes exist", () => {
    const result = buildReverseQuestion(
      profile,
      buildEvidenceBundle({
        nodes: [
          {
            id: "node-1",
            concept: "周末灵感",
            intro: "记下咖啡馆想法",
            sourceLinks: [],
            archived: false,
            createdAt: "2026-06-14T12:00:00Z",
          },
        ],
      }),
      "m5-personal-life",
    );
    expect(result.visible).toBe(true);
    expect(result.evidenceRefs.length).toBeGreaterThan(0);
    expect(result.evidenceRefs[0]).toBe("node:node-1");
    expect(result.prompt.length).toBeGreaterThan(0);
  });
});
