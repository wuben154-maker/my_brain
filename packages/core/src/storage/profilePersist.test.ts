import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { UserModeProfile } from "../domain/userMode.js";
import { applyProfileCorrection, createEmptyCorrectionState, seedTraitsFromProfile } from "../profile/correctionHistory.js";
import { BetterSqliteDriver } from "./betterSqliteDriver.js";
import { MobileStorage } from "./mobileStorage.js";

function reopenStorage(dbPath: string): { storage: MobileStorage; driver: BetterSqliteDriver } {
  const driver = new BetterSqliteDriver(dbPath);
  const storage = new MobileStorage(driver);
  storage.migrate();
  return { storage, driver };
}

describe("profilePersist kill-process recovery", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("keeps suppression after simulated process restart", () => {
    const dir = mkdtempSync(join(tmpdir(), "mybrain-profile-"));
    const dbPath = join(dir, "persist.db");
    cleanup = () => rmSync(dir, { recursive: true, force: true });
    const profile: UserModeProfile = {
      primaryMode: "tech_tracker",
      secondaryModes: [],
      confidence: 0.9,
    };
    {
      const driver = new BetterSqliteDriver(dbPath);
      const storage = new MobileStorage(driver);
      storage.migrate();
      storage.saveUserModeProfile(profile, true);
      let correction = {
        ...createEmptyCorrectionState(),
        traits: seedTraitsFromProfile(profile),
      };
      correction = applyProfileCorrection(correction, "mode-tech_tracker", "suppress");
      storage.saveCorrectionState(correction);
      driver.close();
    }
    const { storage: storage2, driver: driver2 } = reopenStorage(dbPath);
    const bundle = storage2.hydrateBundle();
    expect(bundle.correctionState.suppressionList).toContain("mode-tech_tracker");
    expect(bundle.correctionState.traits.find((t) => t.id === "mode-tech_tracker")?.suppressed).toBe(
      true,
    );
    driver2.close();
  });
});
