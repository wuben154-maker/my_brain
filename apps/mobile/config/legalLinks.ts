import Constants from "expo-constants";

export type PrivacyPolicyScope = "dev-draft" | "production";

export interface PrivacyPolicyLink {
  url: string;
  scope: PrivacyPolicyScope;
  localPath?: string;
  label: string;
}

const DEFAULT_PRIVACY: PrivacyPolicyLink = {
  url: "https://mybrain.local/dev/privacy-policy-draft",
  scope: "dev-draft",
  localPath: "docs/legal/privacy-policy-draft.md",
  label: "隐私政策（local/dev 草案，非生产 legal PASS）",
};

function readExtra(key: string): string | undefined {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== "object") {
    return undefined;
  }
  const value = (extra as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/** Expo-configured privacy policy link — production URL not claimed until legal review. */
export function readPrivacyPolicyLink(): PrivacyPolicyLink {
  const url = readExtra("privacyPolicyUrl") ?? DEFAULT_PRIVACY.url;
  const scopeRaw = readExtra("privacyPolicyScope");
  const scope: PrivacyPolicyScope = scopeRaw === "production" ? "production" : "dev-draft";
  const localPath = readExtra("privacyPolicyLocalPath") ?? DEFAULT_PRIVACY.localPath;
  const label =
    scope === "production"
      ? "隐私政策"
      : "隐私政策（local/dev 草案，非生产 legal PASS）";

  return { url, scope, localPath, label };
}

export const MICROPHONE_PERMISSION_RATIONALE =
  "my_brain 需要麦克风权限以实现可打断的语音对话；拒绝后仍可使用文字三意图。";
