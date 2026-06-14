import {
  MobileStorage,
  type MobilePersistedBundle,
  type SqlDriver,
} from "@my-brain/core";

export type BootStatus = "boot" | "migrating" | "ready" | "migration_error";

export interface StorageSession {
  storage: MobileStorage;
  driver: SqlDriver & { close?: () => void };
  dbPath: string;
}

let session: StorageSession | null = null;

export function getStorageSession(): StorageSession | null {
  return session;
}

export function setStorageSession(next: StorageSession | null): void {
  session = next;
}

export function runMigration(storage: MobileStorage): void {
  storage.migrate();
}

export function hydrateFromStorage(storage: MobileStorage): MobilePersistedBundle {
  return storage.hydrateBundle();
}
