import { describe, expect, it } from "vitest";

import {
  appearanceLabel,
  resolveThemeMode,
} from "./appearancePreference";

describe("appearancePreference", () => {
  it("resolves system preference from device scheme", () => {
    expect(resolveThemeMode("system", "light")).toBe("light");
    expect(resolveThemeMode("system", "dark")).toBe("dark");
  });

  it("pins explicit light and dark choices", () => {
    expect(resolveThemeMode("light", "dark")).toBe("light");
    expect(resolveThemeMode("dark", "light")).toBe("dark");
  });

  it("labels preferences in zh-CN", () => {
    expect(appearanceLabel("system")).toBe("跟随系统");
    expect(appearanceLabel("light")).toBe("浅色");
  });

  it("resolves appearance preference for ThemeProvider integration", () => {
    expect(resolveThemeMode("light", "dark")).toBe("light");
    expect(resolveThemeMode("system", "light")).toBe("light");
  });
});
