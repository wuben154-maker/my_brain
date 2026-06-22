/**
 * CK-06 safe-area / status-bar contract — static source checks (no device screenshots).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { brainTheme, safeArea } from "../theme/tokens";

const ROOT = join(import.meta.dirname, "..");

const TARGET_SCREENS = [
  "screens/LivingBrainHome.tsx",
  "screens/TodayScreen.tsx",
  "screens/SettingsScreen.tsx",
  "screens/ProviderSettingsScreen.tsx",
  "screens/CaptureInboxScreen.tsx",
  "screens/PlaceholderScreen.tsx",
];

function readMobileSource(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf8");
}

describe("CK-06 safe-area status bar contract", () => {
  it("does not use paddingTop: 48 as a hardcoded status hack on targeted screens", () => {
    for (const screen of TARGET_SCREENS) {
      const source = readMobileSource(screen);
      expect(source, screen).not.toMatch(/paddingTop\s*:\s*48\b/);
    }
  });

  it("uses shared safeArea.screenTopChrome on targeted screens", () => {
    for (const screen of TARGET_SCREENS) {
      const source = readMobileSource(screen);
      expect(source, screen).toContain("safeArea.screenTopChrome");
      expect(source, screen).toMatch(/import\s*\{[^}]*safeArea/);
    }
  });

  it("defines safeArea contract tokens aligned with theme backgrounds", () => {
    expect(safeArea.screenTopChrome).toBe(8);
    expect(safeArea.statusBarBackground.dark).toBe(brainTheme.dark.background);
    expect(safeArea.statusBarBackground.light).toBe(brainTheme.light.background);
  });

  it("root App uses theme status-bar backgrounds instead of black or legacy light mismatch", () => {
    const appSource = readMobileSource("App.tsx");

    expect(appSource).toContain("safeArea.statusBarBackground");
    expect(appSource).toContain("backgroundColor={safeArea.statusBarBackground");
    expect(appSource).not.toMatch(/backgroundColor:\s*["']#000000["']/);
    expect(appSource).not.toMatch(/backgroundColor:\s*["']#000["']/);
    expect(appSource).not.toMatch(/backgroundColor:\s*["']#F4F2EF["']/);
    expect(appSource).toContain("backgroundColor={colors.background}");
  });
});
