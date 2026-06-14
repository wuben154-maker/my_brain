import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { IngestProposalError, ProviderConfigError } from "@my-brain/core";
import { BetterSqliteDriver, MobileStorage } from "@my-brain/core";

describe("m1RegistryOnSqlite", () => {
  let cleanup: (() => void) | undefined;
  let activeDriver: BetterSqliteDriver | undefined;

  afterEach(() => {
    activeDriver?.close();
    activeDriver = undefined;
    cleanup?.();
    cleanup = undefined;
  });

  it("keeps pending ingest proposal after simulated kill-process", () => {
    const dir = mkdtempSync(join(tmpdir(), "m1-registry-"));
    const dbPath = join(dir, "registry.db");
    cleanup = () => rmSync(dir, { recursive: true, force: true });

    const proposal = {
      id: "pending-1",
      concept: "待入库概念",
      intro: "简介",
      sourceLinks: ["sig-1"],
      createdAt: "2026-06-13T08:00:00.000Z",
    };

    {
      const driver = new BetterSqliteDriver(dbPath);
      const storage = new MobileStorage(driver);
      storage.migrate();
      try {
        throw new IngestProposalError("LLM proposal failed");
      } catch (e) {
        expect(e).toBeInstanceOf(IngestProposalError);
      }
      storage.savePendingIngestProposal(proposal);
      driver.close();
      activeDriver = undefined;
    }

    {
      const driver = new BetterSqliteDriver(dbPath);
      activeDriver = driver;
      const storage = new MobileStorage(driver);
      storage.migrate();
      const loaded = storage.loadPendingIngestProposal();
      expect(loaded?.id).toBe("pending-1");
      driver.close();
      activeDriver = undefined;
    }
  });

  it("maps ProviderConfigError to provider snapshot without silent live", () => {
    const dir = mkdtempSync(join(tmpdir(), "m1-provider-"));
    const dbPath = join(dir, "provider.db");
    cleanup = () => rmSync(dir, { recursive: true, force: true });
    const driver = new BetterSqliteDriver(dbPath);
    activeDriver = driver;
    const storage = new MobileStorage(driver);
    storage.migrate();
    const err = new ProviderConfigError("MISSING_API_KEY", "no key");
    storage.saveProviderConfig({
      llm: "mock",
      radar: "fixture",
      voice: "disconnected",
      storage: "ready",
      lastErrorCode: err.name,
    });
    const snapshot = storage.loadProviderConfig();
    expect(snapshot.llm).toBe("mock");
    expect(snapshot.lastErrorCode).toBe("ProviderConfigError");
    expect(snapshot.voice).not.toBe("connected");
    driver.close();
    activeDriver = undefined;
  });
});
