/**
 * M4 native share handoff queue — Android intent + iOS App Group → provisional intake.
 * Machine/mock path only until device intent/Extension evidence is recorded.
 */

import type { GraphRepository, UrlFetchGuardDeps } from "@my-brain/core";

import { mapAndroidSendIntentToSharePayload, type AndroidSendIntentExtras } from "./androidShareIntent";
import { parseIosAppGroupSharePayload } from "./iosAppGroupShare";
import { intakeSharePayload, type ShareIntakeResult } from "./shareIntake";
import {
  clearPersistedNativeShareHandoffs,
  loadPersistedNativeShareHandoffs,
  savePersistedNativeShareHandoffs,
} from "./nativeShareHandoffPersistence";

export type NativeShareHandoffSource = "android_intent" | "ios_app_group" | "mock_fixture";

export interface NativeShareHandoffRecord {
  source: NativeShareHandoffSource;
  receivedAt: string;
  raw: unknown;
}

export interface NativeShareHandoffDeps {
  graph: GraphRepository;
  urlGuard?: UrlFetchGuardDeps;
}

export interface NativeShareHandoffConsumeResult {
  processed: number;
  results: Array<{ record: NativeShareHandoffRecord; intake: ShareIntakeResult }>;
  graphNodeCount: number;
}

const pendingQueue: NativeShareHandoffRecord[] = [];

/** Enqueue payload from native bridge (intent extras JSON or App Group JSON). */
export function enqueueNativeShareHandoff(
  source: NativeShareHandoffSource,
  raw: unknown,
): void {
  pendingQueue.push({
    source,
    receivedAt: new Date().toISOString(),
    raw,
  });
  savePersistedNativeShareHandoffs(pendingQueue);
}

/** Merge disk-backed handoff records into the in-memory queue (cold start). */
export function restoreNativeShareHandoffQueue(): void {
  const persisted = loadPersistedNativeShareHandoffs();
  if (persisted.length === 0) {
    return;
  }
  for (const record of persisted) {
    pendingQueue.push(record);
  }
  clearPersistedNativeShareHandoffs();
}

export function peekNativeShareHandoffQueue(): readonly NativeShareHandoffRecord[] {
  return pendingQueue;
}

export function clearNativeShareHandoffQueue(): void {
  pendingQueue.length = 0;
  clearPersistedNativeShareHandoffs();
}

/** Clear in-memory queue only (simulate OS kill — persisted file remains). */
export function clearNativeShareHandoffMemoryQueue(): void {
  pendingQueue.length = 0;
}

async function handoffToIntake(
  record: NativeShareHandoffRecord,
  deps: NativeShareHandoffDeps,
): Promise<ShareIntakeResult> {
  if (record.source === "android_intent") {
    const mapped = mapAndroidSendIntentToSharePayload(record.raw as AndroidSendIntentExtras);
    if (!mapped.ok) {
      return { ok: false, code: "SHARE_PAYLOAD_INVALID", hint: mapped.hint };
    }
    return intakeSharePayload(mapped.payload, deps);
  }

  if (record.source === "ios_app_group") {
    const parsed = parseIosAppGroupSharePayload(record.raw);
    if (!parsed.ok) {
      return { ok: false, code: "SHARE_PAYLOAD_INVALID", hint: parsed.hint };
    }
    return intakeSharePayload(parsed.payload, deps);
  }

  return intakeSharePayload(record.raw, deps);
}

/**
 * Drain pending native handoff queue into provisional intake.
 * Called after M2 storage hydration on app foreground (device path PENDING_DEVICE).
 */
export async function consumeNativeShareHandoffQueue(
  deps: NativeShareHandoffDeps,
): Promise<NativeShareHandoffConsumeResult> {
  const results: NativeShareHandoffConsumeResult["results"] = [];
  while (pendingQueue.length > 0) {
    const record = pendingQueue.shift()!;
    const intake = await handoffToIntake(record, deps);
    results.push({ record, intake });
  }
  if (pendingQueue.length === 0) {
    clearPersistedNativeShareHandoffs();
  } else {
    savePersistedNativeShareHandoffs(pendingQueue);
  }
  return {
    processed: results.length,
    results,
    graphNodeCount: deps.graph.countVisibleNodes(),
  };
}
