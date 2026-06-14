/**
 * Node/Vitest-only storage bootstrap — must not be imported from RN runtime bundle.
 */
import { BetterSqliteDriver, MobileStorage } from "@my-brain/core";

import type { StorageSession } from "./storageSession";

export function createTestStorageSession(dbPath: string): StorageSession {
  const driver = new BetterSqliteDriver(dbPath);
  const storage = new MobileStorage(driver);
  return { storage, driver, dbPath };
}
