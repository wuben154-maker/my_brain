import type { ThemeMode } from "./tokens";

export const APPEARANCE_META_KEY = "appearance.preference";

export type AppearancePreference = "light" | "dark" | "system";

export function isAppearancePreference(value: string | null | undefined): value is AppearancePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveThemeMode(
  preference: AppearancePreference,
  systemScheme: "light" | "dark" | null | undefined,
): ThemeMode {
  if (preference === "light") {
    return "light";
  }
  if (preference === "dark") {
    return "dark";
  }
  return systemScheme === "light" ? "light" : "dark";
}

export function appearanceLabel(pref: AppearancePreference): string {
  if (pref === "light") {
    return "浅色";
  }
  if (pref === "dark") {
    return "深色";
  }
  return "跟随系统";
}
