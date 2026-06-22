import { describe, expect, it, vi } from "vitest";

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        privacyPolicyUrl: "https://mybrain.local/dev/privacy-policy-draft",
        privacyPolicyScope: "dev-draft",
        privacyPolicyLocalPath: "docs/legal/privacy-policy-draft.md",
      },
    },
  },
}));

import {
  MICROPHONE_PERMISSION_RATIONALE,
  readPrivacyPolicyLink,
} from "./legalLinks";

describe("legalLinks", () => {
  it("reads dev-draft privacy policy from Expo extra", () => {
    const link = readPrivacyPolicyLink();
    expect(link.url).toBe("https://mybrain.local/dev/privacy-policy-draft");
    expect(link.scope).toBe("dev-draft");
    expect(link.localPath).toBe("docs/legal/privacy-policy-draft.md");
    expect(link.label).toContain("local/dev");
    expect(link.label).toContain("非生产 legal PASS");
  });

  it("keeps microphone rationale aligned with app.json iOS string", () => {
    expect(MICROPHONE_PERMISSION_RATIONALE).toContain("麦克风");
    expect(MICROPHONE_PERMISSION_RATIONALE).toContain("文字三意图");
  });
});
