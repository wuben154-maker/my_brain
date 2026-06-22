import { ACTION_AUDIT_META_KEY, type ActionAuditEntry } from "@my-brain/core";

import { getStorageSession } from "../storage/storageSession";

const AUDIT_META_KEY = ACTION_AUDIT_META_KEY;
const MAX_ENTRIES = 100;

function readEntries(): ActionAuditEntry[] {
  const session = getStorageSession();
  const raw = session?.storage.getMeta(AUDIT_META_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as ActionAuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: ActionAuditEntry[]): void {
  const session = getStorageSession();
  session?.storage.setMeta(AUDIT_META_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function listActionAuditEntries(): ActionAuditEntry[] {
  return readEntries();
}

export function appendActionAuditEntry(entry: ActionAuditEntry): void {
  const entries = readEntries();
  writeEntries([entry, ...entries]);
}

export function clearActionAuditEntriesForTests(): void {
  writeEntries([]);
}
