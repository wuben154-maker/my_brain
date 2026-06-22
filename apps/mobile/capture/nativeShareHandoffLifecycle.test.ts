import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: vi.fn(),
  },
  Platform: { OS: "android" },
}));

import { InMemoryGraphRepository } from "@my-brain/core";

import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import {
  clearNativeShareHandoffMemoryQueue,
  clearNativeShareHandoffQueue,
  consumeNativeShareHandoffQueue,
  enqueueNativeShareHandoff,
  peekNativeShareHandoffQueue,
  restoreNativeShareHandoffQueue,
} from "./nativeShareHandoff";
import { createNodeFileHandoffPersistence } from "./nativeShareHandoffPersistence.node";
import { setNativeShareHandoffPersistenceAdapter } from "./nativeShareHandoffPersistence";
import {
  resetNativeShareHandoffLifecycleForTests,
  runNativeShareHandoffLifecycleDrain,
} from "./nativeShareHandoffLifecycle";

describe("nativeShareHandoff persistence + lifecycle", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    setNativeShareHandoffPersistenceAdapter(null);
    clearNativeShareHandoffQueue();
    resetNativeShareHandoffLifecycleForTests();
    useProvisionalStore.setState({
      candidates: [],
      lastExplanation: null,
      lastSsrfHint: null,
      lastShareIntakeDiagnostic: null,
    });
    useMobileAppStore.setState({
      queueSheetOpen: false,
      graph: new InMemoryGraphRepository(),
    });
  });

  it("restores persisted handoff queue after simulated process kill", async () => {
    const dir = mkdtempSync(join(tmpdir(), "m4-handoff-persist-"));
    const filePath = join(dir, "native-share-handoff-queue.json");
    cleanup = () => rmSync(dir, { recursive: true, force: true });

    setNativeShareHandoffPersistenceAdapter(createNodeFileHandoffPersistence(filePath));
    enqueueNativeShareHandoff("android_intent", {
      action: "android.intent.action.SEND",
      mimeType: "text/plain",
      text: "杀进程后恢复",
    });
    expect(peekNativeShareHandoffQueue()).toHaveLength(1);

    clearNativeShareHandoffMemoryQueue();
    expect(peekNativeShareHandoffQueue()).toHaveLength(0);

    restoreNativeShareHandoffQueue();
    expect(peekNativeShareHandoffQueue()).toHaveLength(1);

    const graph = new InMemoryGraphRepository();
    const consumed = await consumeNativeShareHandoffQueue({ graph });
    expect(consumed.processed).toBe(1);
    expect(consumed.graphNodeCount).toBe(0);
  });

  it("runNativeShareHandoffLifecycleDrain restores and drains into provisional store", async () => {
    const dir = mkdtempSync(join(tmpdir(), "m4-handoff-lifecycle-"));
    const filePath = join(dir, "native-share-handoff-queue.json");
    cleanup = () => rmSync(dir, { recursive: true, force: true });

    setNativeShareHandoffPersistenceAdapter(createNodeFileHandoffPersistence(filePath));
    enqueueNativeShareHandoff("android_intent", {
      action: "android.intent.action.SEND",
      mimeType: "text/plain",
      text: "冷启动 drain 测试",
    });
    clearNativeShareHandoffMemoryQueue();

    await runNativeShareHandoffLifecycleDrain();
    expect(useProvisionalStore.getState().candidates).toHaveLength(1);
    expect(peekNativeShareHandoffQueue()).toHaveLength(0);
    expect(useMobileAppStore.getState().queueSheetOpen).toBe(true);
    expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);
  });
});
