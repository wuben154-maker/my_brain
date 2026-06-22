/**
 * Android ACTION_SEND runtime bridge — native extras → nativeShareHandoff queue.
 * Injectable source for tests; production uses local Expo module when present.
 */

import { Platform } from "react-native";

import { mapAndroidSendIntentToSharePayload, type AndroidSendIntentExtras } from "./androidShareIntent";
import { enqueueNativeShareHandoff } from "./nativeShareHandoff";
import { runNativeShareHandoffLifecycleDrain } from "./nativeShareHandoffLifecycle";

const BRIDGE_LOG_TAG = "AndroidIntentBridge";

function logBridge(stage: string, detail?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  console.log(`[${BRIDGE_LOG_TAG}] ${stage}`, detail ?? {});
}

export interface AndroidIntentBridgeSource {
  getInitialSendIntentExtras?: () => Promise<unknown | null | undefined>;
  pollPendingSendIntentExtras?: () => Promise<unknown | null | undefined>;
  addSendIntentListener?: (listener: (raw: unknown) => void) => () => void;
}

let injectedSource: AndroidIntentBridgeSource | null = null;
let bridgeWired = false;
let listenerCleanup: (() => void) | null = null;

/** Test hook — override native module / event source. */
export function setAndroidIntentBridgeSourceForTests(source: AndroidIntentBridgeSource | null): void {
  injectedSource = source;
}

export function resetAndroidIntentBridgeForTests(): void {
  bridgeWired = false;
  listenerCleanup?.();
  listenerCleanup = null;
  injectedSource = null;
}

export function isAndroidSendIntentExtras(raw: unknown): raw is AndroidSendIntentExtras {
  if (typeof raw !== "object" || raw === null) {
    return false;
  }
  const action = (raw as { action?: unknown }).action;
  return action === "android.intent.action.SEND";
}

/**
 * Validate extras and enqueue for provisional drain.
 * Returns false for missing/unsupported/malformed payloads (no queue write).
 */
export function tryEnqueueAndroidIntentHandoff(raw: unknown): boolean {
  if (!isAndroidSendIntentExtras(raw)) {
    logBridge("tryEnqueue_reject_not_send_extras");
    return false;
  }
  const mapped = mapAndroidSendIntentToSharePayload(raw);
  if (!mapped.ok) {
    logBridge("tryEnqueue_reject_map_failed", { code: mapped.code, hint: mapped.hint });
    return false;
  }
  enqueueNativeShareHandoff("android_intent", raw);
  logBridge("android_intent_handoff_enqueued", {
    payloadKind: mapped.payload.payloadKind,
    hasSourceApp: Boolean(raw.sourcePackage),
  });
  return true;
}

function resolveBridgeSource(override?: AndroidIntentBridgeSource): AndroidIntentBridgeSource {
  if (override) {
    return override;
  }
  if (injectedSource) {
    return injectedSource;
  }
  return createDefaultAndroidIntentBridgeSource();
}

/** Poll initial + buffered native intents; returns count enqueued this pass. */
export async function pollAndroidIntentBridge(
  sourceOverride?: AndroidIntentBridgeSource,
): Promise<number> {
  if (Platform.OS !== "android") {
    return 0;
  }

  const source = resolveBridgeSource(sourceOverride);
  let enqueued = 0;

  const initial = await source.getInitialSendIntentExtras?.();
  if (initial != null) {
    logBridge("poll_initial_extras_received", {
      hasText: Boolean((initial as AndroidSendIntentExtras).text),
      mimeType: (initial as AndroidSendIntentExtras).mimeType,
    });
    if (tryEnqueueAndroidIntentHandoff(initial)) {
      enqueued += 1;
    }
  } else {
    logBridge("poll_initial_extras_empty");
  }

  for (;;) {
    const pending = await source.pollPendingSendIntentExtras?.();
    if (pending == null) {
      break;
    }
    logBridge("poll_pending_extras_received", {
      hasText: Boolean((pending as AndroidSendIntentExtras).text),
      mimeType: (pending as AndroidSendIntentExtras).mimeType,
    });
    if (tryEnqueueAndroidIntentHandoff(pending)) {
      enqueued += 1;
    }
  }

  logBridge("poll_complete", { enqueued });
  return enqueued;
}

/** Wire Android share intent listeners once (no-op off Android / without native module). */
export function wireAndroidIntentBridge(): void {
  if (Platform.OS !== "android" || bridgeWired) {
    return;
  }
  bridgeWired = true;

  const source = resolveBridgeSource();
  const hasListener = Boolean(source.addSendIntentListener);
  logBridge("wire_complete", { hasListener, hasInitial: Boolean(source.getInitialSendIntentExtras) });
  listenerCleanup = source.addSendIntentListener?.((raw) => {
    logBridge("event_AndroidSendIntentReceived");
    if (tryEnqueueAndroidIntentHandoff(raw)) {
      void runNativeShareHandoffLifecycleDrain();
    }
  }) ?? null;
}

function createDefaultAndroidIntentBridgeSource(): AndroidIntentBridgeSource {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { EventEmitter, requireNativeModule } = require("expo-modules-core") as typeof import("expo-modules-core");
    const native = requireNativeModule<{
      getInitialSendIntentExtras: () => Promise<unknown | null>;
      pollPendingSendIntentExtras: () => Promise<unknown | null>;
    }>("AndroidShareIntent");
    // Expo EventEmitter expects the native module instance; typing is module-specific.
    const emitter = new EventEmitter(native as never);

    logBridge("native_module_loaded");

    return {
      getInitialSendIntentExtras: () => native.getInitialSendIntentExtras(),
      pollPendingSendIntentExtras: () => native.pollPendingSendIntentExtras(),
      addSendIntentListener: (listener) => {
        const subscription = (
          emitter as unknown as {
            addListener: (event: string, cb: (raw: unknown) => void) => { remove: () => void };
          }
        ).addListener("AndroidSendIntentReceived", listener);
        return () => {
          subscription.remove();
        };
      },
    };
  } catch (error) {
    logBridge("native_module_unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
}
