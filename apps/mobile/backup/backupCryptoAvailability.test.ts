import { describe, expect, it } from "vitest";

import * as backupHandoff from "../backup/backupHandoff";

describe("LIVE-09 backup scope", () => {
  it("exposes plain JSON handoff only", () => {
    expect(backupHandoff.exportLocalBackup).toBeTypeOf("function");
    expect(backupHandoff.importLocalBackup).toBeTypeOf("function");
    expect("exportEncryptedLocalBackup" in backupHandoff).toBe(false);
    expect("importEncryptedLocalBackup" in backupHandoff).toBe(false);
  });
});
