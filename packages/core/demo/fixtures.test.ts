import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACTION_AUDIT_META_KEY,
  BetterSqliteDriver,
  DEMO_FIXTURE_SOURCE,
  DEMO_GRAPH_FIXTURE,
  DEMO_MODE_META_KEY,
  MobileStorage,
  SHOWCASE_FLOW_STEPS,
  buildDemoSeedBundle,
  demoFixtureFingerprint,
  resetDemoStorage,
} from "@my-brain/core";

describe("demo fixtures", () => {
  it("demo_graph_v1 is deterministic", () => {
    const a = demoFixtureFingerprint();
    const b = demoFixtureFingerprint();
    expect(a).toBe(b);
    expect(a).toMatch(/^demo-v1-[0-9a-f]+$/);
  });

  it("all graph nodes carry demo_fixture source and no API keys", () => {
    const bundle = buildDemoSeedBundle();
    expect(bundle.graph.nodes).toHaveLength(DEMO_GRAPH_FIXTURE.nodes.length);
    for (const node of bundle.graph.nodes) {
      expect(node.ingestSource).toBe(DEMO_FIXTURE_SOURCE);
      expect(JSON.stringify(node)).not.toMatch(/sk-[a-zA-Z0-9]{10,}/);
      expect(JSON.stringify(node)).not.toMatch(/Bearer\s+/);
    }
  });

  it("seed bundle defaults to empty provisional queue", () => {
    const bundle = buildDemoSeedBundle();
    expect(bundle.provisional).toEqual([]);
    expect(bundle.profile?.primaryMode).toBe("tech_tracker");
    expect(bundle.coldStartComplete).toBe(true);
  });

  it("showcase contract defines seven steps with testIds", () => {
    expect(SHOWCASE_FLOW_STEPS).toHaveLength(7);
    for (const step of SHOWCASE_FLOW_STEPS) {
      expect(step.testIds.length).toBeGreaterThan(0);
      expect(step.audienceTakeaway.length).toBeGreaterThan(0);
    }
  });

  it("exports demo mode meta key for labeled reset", () => {
    expect(DEMO_MODE_META_KEY).toBe("demo_mode");
    expect(ACTION_AUDIT_META_KEY).toBe("action.audit.v1");
  });

  it("resetDemoStorage clears prior action audit app_meta", () => {
    const dir = mkdtempSync(join(tmpdir(), "demo-reset-audit-"));
    const dbPath = join(dir, "test.db");
    const driver = new BetterSqliteDriver(dbPath);
    const storage = new MobileStorage(driver);
    try {
      storage.migrate();
      storage.setMeta(
        ACTION_AUDIT_META_KEY,
        JSON.stringify([
          {
            actionId: "prior-audit",
            actionType: "explain_concept",
            createdAt: "2026-06-01T08:00:00.000Z",
            status: "saved",
          },
        ]),
      );
      expect(storage.getMeta(ACTION_AUDIT_META_KEY)).not.toBeNull();

      resetDemoStorage(storage);

      expect(storage.getMeta(ACTION_AUDIT_META_KEY)).toBeNull();
      expect(storage.getMeta(DEMO_MODE_META_KEY)).toBe("true");
    } finally {
      driver.close();
    }
  });
});
