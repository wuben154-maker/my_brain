import { requireNativeModule } from "expo-modules-core";

export type AndroidShareIntentNativeExtras = {
  action: "android.intent.action.SEND";
  mimeType?: string;
  text?: string;
  subject?: string;
  streamUri?: string;
  sourcePackage?: string;
  capturedAt?: string;
};

type AndroidShareIntentNative = {
  getInitialSendIntentExtras: () => Promise<AndroidShareIntentNativeExtras | null>;
  pollPendingSendIntentExtras: () => Promise<AndroidShareIntentNativeExtras | null>;
};

const Native = requireNativeModule<AndroidShareIntentNative>("AndroidShareIntent");

export function getInitialSendIntentExtras(): Promise<AndroidShareIntentNativeExtras | null> {
  return Native.getInitialSendIntentExtras();
}

export function pollPendingSendIntentExtras(): Promise<AndroidShareIntentNativeExtras | null> {
  return Native.pollPendingSendIntentExtras();
}

export const ANDROID_SHARE_INTENT_EVENT = "AndroidSendIntentReceived" as const;
