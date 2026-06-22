/**
 * Node-only file persistence for vitest (never imported by the RN bundle).
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { NativeShareHandoffRecord } from "./nativeShareHandoff";
import type { NativeShareHandoffPersistenceAdapter } from "./nativeShareHandoffPersistence";

export function createNodeFileHandoffPersistence(
  filePath: string,
): NativeShareHandoffPersistenceAdapter {
  return {
    load() {
      if (!existsSync(filePath)) {
        return [];
      }
      try {
        const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
        return Array.isArray(parsed) ? (parsed as NativeShareHandoffRecord[]) : [];
      } catch {
        return [];
      }
    },
    save(records) {
      if (records.length === 0) {
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
        return;
      }
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        return;
      }
      writeFileSync(filePath, JSON.stringify(records), "utf8");
    },
    clear() {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    },
  };
}
