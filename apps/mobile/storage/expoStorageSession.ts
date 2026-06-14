/**
 * Expo Dev Client / device runtime storage bootstrap via expo-sqlite sync APIs.
 */
import { MobileStorage, MOBILE_DB_NAME } from "@my-brain/core";
import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

import {
  applyIosSqliteBackupExclusion,
  ensureIosSqliteWalSidecars,
} from "./iosBackupExclusion";
import { ExpoSqliteDriver } from "./expoSqliteDriver";
import type { StorageSession } from "./storageSession";

export function createExpoStorageSession(): StorageSession {
  const db = openDatabaseSync(MOBILE_DB_NAME);
  const driver = new ExpoSqliteDriver(db as SQLiteDatabase);
  ensureIosSqliteWalSidecars(driver);
  applyIosSqliteBackupExclusion(db.databasePath);
  const storage = new MobileStorage(driver);
  return { storage, driver, dbPath: db.databasePath };
}
