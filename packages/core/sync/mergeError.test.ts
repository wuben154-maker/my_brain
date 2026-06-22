import { describe, expect, it } from "vitest";

import {
  SyncConflictError,
  SyncIngestGateViolation,
  SyncMergeTransactionError,
  isSyncStructuredError,
} from "../src/sync/errors.js";

describe("sync mergeError", () => {
  it("SyncConflictError exposes §6.1 structured fields", () => {
    const error = new SyncConflictError({
      conflictId: "conflict-1",
      field: "interests",
      message: "Profile field interests conflict on both devices",
      hintCode: "conflict:profile_field:interests",
      attempt: 2,
    });
    expect(error.error_class).toBe("SyncConflictError");
    expect(error.hint_code).toBe("conflict:profile_field:interests");
    expect(error.root_cause_hint).toContain("interests");
    expect(error.safe_retry).toMatch(/replay merge/i);
    expect(error.stop_condition).toMatch(/3/);
    expect(error.conflictId).toBe("conflict-1");
    expect(error.attempt).toBe(2);
    expect(isSyncStructuredError(error)).toBe(true);
  });

  it("SyncIngestGateViolation includes ingest_gate hint_code", () => {
    const error = new SyncIngestGateViolation(["node-x"]);
    expect(error.error_class).toBe("IngestGateViolation");
    expect(error.hint_code).toBe("ingest_gate:no_confirmed_flag");
    expect(error.nodeIds).toEqual(["node-x"]);
    expect(error.stop_condition).toMatch(/pause sync/i);
  });

  it("SyncMergeTransactionError supports transaction stop condition", () => {
    const error = new SyncMergeTransactionError(
      "transaction:graph_history_co_write_failed",
      "Graph history co-write failed during sync merge",
    );
    expect(error.hint_code).toBe("transaction:graph_history_co_write_failed");
    expect(error.safe_retry).toMatch(/cooldown/i);
    expect(error.stop_condition).toMatch(/3 times/);
  });

  it("hard stops after third unresolved SyncConflictError attempt", () => {
    expect(() =>
      new SyncConflictError({
        conflictId: "c-3",
        field: "mode-learner",
        message: "unresolved",
        attempt: 3,
      }),
    ).not.toThrow();
    const error = new SyncConflictError({
      conflictId: "c-3",
      field: "mode-learner",
      message: "Profile sync conflict unresolved after 3 attempts",
      attempt: 3,
    });
    expect(error.stop_condition).toContain("3");
  });
});
