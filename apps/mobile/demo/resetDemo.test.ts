import { describe, expect, it } from "vitest";

import { ACTION_AUDIT_META_KEY, SHOWCASE_FLOW_STEPS } from "@my-brain/core";

import { appendActionAuditEntry, listActionAuditEntries } from "../services/actionAuditStore";
import { createTestStorageSession } from "../storage/testStorageSession";
import { setStorageSession } from "../storage/storageSession";
import { resetDemo, DEMO_FIXTURE_NODE_COUNT } from "./resetDemo";

describe("resetDemo", () => {
  it("reset yields fixture graph count and demoMode", () => {
    const first = resetDemo();
    expect(first.demoMode).toBe(true);
    expect(first.graphNodeCount).toBe(DEMO_FIXTURE_NODE_COUNT);
    expect(first.seedVersion).toBe("demo_graph_v1");

    const second = resetDemo({ dbPath: first.dbPath });
    expect(second.graphNodeCount).toBe(DEMO_FIXTURE_NODE_COUNT);
    expect(second.demoMode).toBe(true);
  });

  it("reset is repeatable on same db path", () => {
    const first = resetDemo();
    const second = resetDemo({ dbPath: first.dbPath });
    expect(second.fingerprint).toBe(first.fingerprint);
    expect(second.provisionalCount).toBe(0);
  });

  it("reset clears prior action audit app_meta", () => {
    const first = resetDemo();
    const session = createTestStorageSession(first.dbPath);
    setStorageSession(session);
    try {
      appendActionAuditEntry({
        actionId: "demo-reset-audit",
        actionType: "explain_concept",
        createdAt: "2026-06-01T08:00:00.000Z",
        status: "saved",
      });
      expect(listActionAuditEntries()).toHaveLength(1);
      expect(session.storage.getMeta(ACTION_AUDIT_META_KEY)).not.toBeNull();

      resetDemo({ dbPath: first.dbPath });

      const afterSession = createTestStorageSession(first.dbPath);
      try {
        expect(afterSession.storage.getMeta(ACTION_AUDIT_META_KEY)).toBeNull();
      } finally {
        afterSession.driver.close();
      }
    } finally {
      setStorageSession(null);
      session.driver.close();
    }
  });
});

describe("showcaseFlow harness", () => {
  it("reset → seed → seven-step testId contract", () => {
    const result = resetDemo();
    expect(result.graphNodeCount).toBe(DEMO_FIXTURE_NODE_COUNT);

    const steps = SHOWCASE_FLOW_STEPS;
    expect(steps).toHaveLength(7);
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6, 7]);

    const requiredAnchors = [
      "living-brain-home",
      "home-voice-orb",
      "today-screen",
      "capture-inbox-screen",
      "brain-map-screen",
      "memory-review-screen",
      "settings-screen",
      "provider-status-llm",
    ];
    const allTestIds = steps.flatMap((s) => [...s.testIds]);
    for (const anchor of requiredAnchors) {
      expect(allTestIds, `missing showcase anchor ${anchor}`).toContain(anchor);
    }
  });
});
