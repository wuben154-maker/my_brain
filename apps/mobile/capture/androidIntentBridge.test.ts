import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

import {
  clearNativeShareHandoffQueue,
  peekNativeShareHandoffQueue,
} from "./nativeShareHandoff";
import {
  pollAndroidIntentBridge,
  resetAndroidIntentBridgeForTests,
  setAndroidIntentBridgeSourceForTests,
  tryEnqueueAndroidIntentHandoff,
  wireAndroidIntentBridge,
} from "./androidIntentBridge";

describe("androidIntentBridge", () => {
  afterEach(() => {
    clearNativeShareHandoffQueue();
    resetAndroidIntentBridgeForTests();
  });

  it("enqueues supported ACTION_SEND text extras", () => {
    const ok = tryEnqueueAndroidIntentHandoff({
      action: "android.intent.action.SEND",
      mimeType: "text/plain",
      text: "runtime bridge 测试",
    });
    expect(ok).toBe(true);
    expect(peekNativeShareHandoffQueue()).toHaveLength(1);
    expect(peekNativeShareHandoffQueue()[0]?.source).toBe("android_intent");
  });

  it("ignores unsupported action", () => {
    const ok = tryEnqueueAndroidIntentHandoff({
      action: "android.intent.action.VIEW",
      text: "https://example.com",
    });
    expect(ok).toBe(false);
    expect(peekNativeShareHandoffQueue()).toHaveLength(0);
  });

  it("ignores missing payload", () => {
    expect(tryEnqueueAndroidIntentHandoff(null)).toBe(false);
    expect(tryEnqueueAndroidIntentHandoff(undefined)).toBe(false);
    expect(peekNativeShareHandoffQueue()).toHaveLength(0);
  });

  it("pollAndroidIntentBridge enqueues initial native extras", async () => {
    setAndroidIntentBridgeSourceForTests({
      getInitialSendIntentExtras: async () => ({
        action: "android.intent.action.SEND",
        mimeType: "text/plain",
        text: "https://example.com/article",
      }),
    });

    const enqueued = await pollAndroidIntentBridge();
    expect(enqueued).toBe(1);
    expect(peekNativeShareHandoffQueue()).toHaveLength(1);
  });

  it("pollAndroidIntentBridge drains buffered pending intents", async () => {
    let pollCount = 0;
    setAndroidIntentBridgeSourceForTests({
      pollPendingSendIntentExtras: async () => {
        pollCount += 1;
        if (pollCount === 1) {
          return {
            action: "android.intent.action.SEND",
            mimeType: "text/plain",
            text: "第一条",
          };
        }
        if (pollCount === 2) {
          return {
            action: "android.intent.action.SEND",
            mimeType: "text/plain",
            text: "第二条",
          };
        }
        return null;
      },
    });

    const enqueued = await pollAndroidIntentBridge();
    expect(enqueued).toBe(2);
    expect(peekNativeShareHandoffQueue()).toHaveLength(2);
  });

  it("pollAndroidIntentBridge skips malformed native extras without enqueue", async () => {
    setAndroidIntentBridgeSourceForTests({
      getInitialSendIntentExtras: async () => ({
        action: "android.intent.action.SEND",
        mimeType: "text/plain",
        text: "http://insecure.example",
      }),
      pollPendingSendIntentExtras: async () => null,
    });

    const enqueued = await pollAndroidIntentBridge();
    expect(enqueued).toBe(0);
    expect(peekNativeShareHandoffQueue()).toHaveLength(0);
  });

  it("wireAndroidIntentBridge listener enqueues then drains on event", async () => {
    let listener: ((raw: unknown) => void) | undefined;
    setAndroidIntentBridgeSourceForTests({
      addSendIntentListener: (cb) => {
        listener = cb;
        return () => undefined;
      },
    });

    wireAndroidIntentBridge();
    expect(listener).toBeTypeOf("function");

    listener?.({
      action: "android.intent.action.SEND",
      mimeType: "text/plain",
      text: "热启动分享",
    });
    expect(peekNativeShareHandoffQueue()).toHaveLength(1);
  });
});
