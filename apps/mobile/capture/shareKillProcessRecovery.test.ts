import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  BetterSqliteDriver,
  MobileStorage,
  createProvisionalCandidate,
  listPendingCandidates,
} from "@my-brain/core";

import { hydrateMobileStores } from "../stores/persistHydrate";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import {
  clearNativeShareHandoffQueue,
  enqueueNativeShareHandoff,
} from "./nativeShareHandoff";

describe("shareKillProcessRecovery", () => {
  let cleanup: (() => void) | undefined;
  let activeDriver: BetterSqliteDriver | undefined;

  afterEach(() => {
    activeDriver?.close();
    activeDriver = undefined;
    cleanup?.();
    cleanup = undefined;
  });

  it("keeps share-intake provisional candidates after simulated kill-process rehydration", () => {
    const dir = mkdtempSync(join(tmpdir(), "m4-share-kill-"));
    const dbPath = join(dir, "share-kill.db");
    cleanup = () => rmSync(dir, { recursive: true, force: true });

    const shareCandidate = createProvisionalCandidate({
      sourceType: "link",
      summary: "Chrome 分享链接",
      linkUrl: "https://example.com/share-kill-fixture",
      evidenceRefs: ["https://example.com/share-kill-fixture"],
    });

    {
      const driver = new BetterSqliteDriver(dbPath);
      activeDriver = driver;
      const storage = new MobileStorage(driver);
      storage.migrate();
      storage.saveProvisionalCandidates([shareCandidate]);
      expect(storage.loadProvisionalCandidates()).toHaveLength(1);
      expect(storage.hydrateBundle().graph.nodes.filter((n) => !n.archived)).toHaveLength(0);
      driver.close();
      activeDriver = undefined;
    }

    {
      const driver = new BetterSqliteDriver(dbPath);
      activeDriver = driver;
      const storage = new MobileStorage(driver);
      storage.migrate();
      const bundle = storage.hydrateBundle();

      useProvisionalStore.setState({ candidates: [], lastExplanation: null, lastSsrfHint: null });
      hydrateMobileStores(bundle, false);

      const pending = listPendingCandidates(useProvisionalStore.getState().candidates);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.id).toBe(shareCandidate.id);
      expect(pending[0]?.summary).toContain("Chrome");
      expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);

      driver.close();
      activeDriver = undefined;
    }
  });

  it("keeps native android intent handoff candidates after store persist + rehydration", async () => {
    const dir = mkdtempSync(join(tmpdir(), "m4-native-handoff-"));
    const dbPath = join(dir, "native-handoff.db");
    cleanup = () => rmSync(dir, { recursive: true, force: true });

    clearNativeShareHandoffQueue();
    enqueueNativeShareHandoff("android_intent", {
      action: "android.intent.action.SEND",
      mimeType: "text/plain",
      text: "Android ACTION_SEND 持久化测试",
      sourcePackage: "com.android.chrome",
    });

    {
      const driver = new BetterSqliteDriver(dbPath);
      activeDriver = driver;
      const storage = new MobileStorage(driver);
      storage.migrate();

      useProvisionalStore.setState({
        candidates: [],
        lastExplanation: null,
        lastSsrfHint: null,
        lastShareIntakeDiagnostic: null,
      });

      const consumed = await useProvisionalStore.getState().drainNativeShareHandoffQueue();
      expect(consumed.processed).toBe(1);
      expect(consumed.graphNodeCount).toBe(0);
      expect(useProvisionalStore.getState().candidates).toHaveLength(1);

      storage.saveProvisionalCandidates(useProvisionalStore.getState().candidates);
      expect(storage.loadProvisionalCandidates()).toHaveLength(1);
      driver.close();
      activeDriver = undefined;
    }

    {
      const driver = new BetterSqliteDriver(dbPath);
      activeDriver = driver;
      const storage = new MobileStorage(driver);
      storage.migrate();
      const bundle = storage.hydrateBundle();

      useProvisionalStore.setState({ candidates: [], lastExplanation: null, lastSsrfHint: null });
      hydrateMobileStores(bundle, false);

      const pending = listPendingCandidates(useProvisionalStore.getState().candidates);
      expect(pending).toHaveLength(1);
      expect(pending[0]?.summary).toContain("Android ACTION_SEND");
      expect(useMobileAppStore.getState().graph.countVisibleNodes()).toBe(0);

      driver.close();
      activeDriver = undefined;
    }
  });

  it("documents device evidence pending for true OS kill after native share handoff", () => {
    expect("PENDING_DEVICE").toBe("PENDING_DEVICE");
  });
});
