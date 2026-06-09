import { describe, expect, it } from "vitest";
import { createTempStorage } from "@/invariants/testStorage";
import {
  BOOT_CHECK_IDS,
  computeSelfCheckProgress,
  createBootCheckDefinitions,
  statusLabel,
  toPendingChecks,
} from "./bootSelfCheck";

describe("bootSelfCheck", () => {
  it("maps status to zh-CN labels", () => {
    expect(statusLabel("pending")).toBe("待命");
    expect(statusLabel("syncing")).toBe("检测中…");
    expect(statusLabel("ok")).toBe("检测通过");
    expect(statusLabel("warn")).toBe("待配置");
  });

  it("creates five pending checks in v2 order", async () => {
    const { storage, cleanup } = createTempStorage();
    try {
      const defs = createBootCheckDefinitions(
        {
          openAiApiKey: "",
          openAiLlmModel: "",
          openAiRealtimeModel: "",
          everMemOsBaseUrl: "http://127.0.0.1:1995",
          everMemOsApiKey: "",
          everMemOsUserId: "my_brain_local",
          domesticLlmApiKey: "",
          domesticLlmBaseUrl: "",
        },
        storage,
      );
      const pending = toPendingChecks(defs);
      expect(pending).toHaveLength(5);
      expect(pending.every((c) => c.status === "pending")).toBe(true);
      expect(pending.map((c) => c.id)).toEqual([...BOOT_CHECK_IDS]);
      expect(pending.map((c) => c.label)).toEqual([
        "麦克风",
        "扬声器",
        "网络",
        "资讯源",
        "大脑读写",
      ]);
    } finally {
      cleanup();
    }
  });

  it("computes progress from row statuses", () => {
    expect(
      computeSelfCheckProgress([
        { id: "mic", label: "麦克风", status: "ok" },
        { id: "speaker", label: "扬声器", status: "ok" },
        { id: "network", label: "网络", status: "ok" },
        { id: "news", label: "资讯源", status: "ok" },
        { id: "storage", label: "大脑读写", status: "syncing" },
      ]),
    ).toBe(80);
  });
});
