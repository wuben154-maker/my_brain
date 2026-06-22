import { describe, expect, it, vi } from "vitest";

import * as ingestModule from "../conversation/ingest.js";
import { buildActionDraft } from "./draftBuilder.js";
import { COGNITIVE_ACTION_TYPES } from "./types.js";

describe("cognitive actions — no silent permanent node create", () => {
  it("buildActionDraft never calls applyIngestCreate for any action type", () => {
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    for (const actionType of COGNITIVE_ACTION_TYPES) {
      const draft = buildActionDraft(actionType, {
        title: "测试草稿",
        summary: "仅建议，不自动入库",
        conceptNames: ["Graph RAG", "Voice OS"],
      });
      expect(draft.status).toBe("draft");
    }

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
