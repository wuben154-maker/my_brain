import { describe, expect, it } from "vitest";
import { createBootCheckDefinitions, statusLabel, toPendingChecks } from "./bootSelfCheck";

describe("bootSelfCheck", () => {
  it("maps status to zh-CN labels", () => {
    expect(statusLabel("pending")).toBe("待命");
    expect(statusLabel("syncing")).toBe("检测中");
    expect(statusLabel("ok")).toBe("就绪");
    expect(statusLabel("warn")).toBe("待配置");
  });

  it("creates five pending checks including news source", () => {
    const defs = createBootCheckDefinitions({ openAiApiKey: "", openAiLlmModel: "", openAiRealtimeModel: "" });
    const pending = toPendingChecks(defs);
    expect(pending).toHaveLength(4);
    expect(pending.every((c) => c.status === "pending")).toBe(true);
    expect(pending.map((c) => c.id)).toContain("news");
  });
});
