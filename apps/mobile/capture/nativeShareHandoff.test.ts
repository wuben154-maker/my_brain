import { describe, expect, it, beforeEach } from "vitest";

import { InMemoryGraphRepository } from "@my-brain/core";

import {
  clearNativeShareHandoffQueue,
  consumeNativeShareHandoffQueue,
  enqueueNativeShareHandoff,
  peekNativeShareHandoffQueue,
} from "./nativeShareHandoff";
import { IOS_APP_GROUP_PAYLOAD_EXAMPLE } from "./iosAppGroupShare";

describe("nativeShareHandoff", () => {
  beforeEach(() => {
    clearNativeShareHandoffQueue();
  });

  it("drains android intent queue into provisional intake without permanent nodes", async () => {
    const graph = new InMemoryGraphRepository();
    enqueueNativeShareHandoff("android_intent", {
      action: "android.intent.action.SEND",
      mimeType: "text/plain",
      text: "记下 M4 分享测试",
    });

    const consumed = await consumeNativeShareHandoffQueue({ graph });
    expect(consumed.processed).toBe(1);
    expect(consumed.graphNodeCount).toBe(0);
    expect(consumed.results[0]?.intake.ok).toBe(true);
    expect(peekNativeShareHandoffQueue()).toHaveLength(0);
  });

  it("drains ios app group payload through validateSharePayload", async () => {
    const graph = new InMemoryGraphRepository();
    enqueueNativeShareHandoff("ios_app_group", IOS_APP_GROUP_PAYLOAD_EXAMPLE);

    const consumed = await consumeNativeShareHandoffQueue({ graph });
    expect(consumed.processed).toBe(1);
    expect(consumed.graphNodeCount).toBe(0);
    expect(consumed.results[0]?.intake.ok).toBe(true);
    if (consumed.results[0]?.intake.ok) {
      expect(consumed.results[0].intake.candidate.sourceType).toBe("link");
    }
  });

  it("returns safe error for malformed ios app group payload", async () => {
    const graph = new InMemoryGraphRepository();
    enqueueNativeShareHandoff("ios_app_group", { platform: "ios", apiKey: "sk-test" });

    const consumed = await consumeNativeShareHandoffQueue({ graph });
    expect(consumed.processed).toBe(1);
    expect(consumed.results[0]?.intake.ok).toBe(false);
    expect(graph.countVisibleNodes()).toBe(0);
  });
});
