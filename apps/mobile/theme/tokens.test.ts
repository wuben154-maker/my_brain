import { describe, expect, it } from "vitest";

import {
  brainTheme,
  copy,
  colors,
  fontFamily,
  fontWeight,
  getModeAccent,
  getThemeColors,
  opacity,
  radius,
  spacing,
  textOnPrimary,
  typography,
  warmInkColorContract,
  warmInkUiSource,
} from "./tokens";

describe("theme tokens", () => {
  it("exports dark primary #7B8CFF and light theme", () => {
    expect(brainTheme.dark.primary).toBe("#7B8CFF");
    expect(brainTheme.light.primary).toBe("#5B6FE8");
    expect(brainTheme.light.background).toBe("#F7F5F2");
  });

  it("traces Warm Ink contract to app-development/UI", () => {
    expect(warmInkUiSource.contractDir).toBe("app-development/UI");
    expect(brainTheme.dark.background).toBe(warmInkColorContract.dark.background);
    expect(brainTheme.dark.accent).toBe(warmInkColorContract.dark.accent);
    expect(brainTheme.light.surface).toBe(warmInkColorContract.light.surface);
  });

  it("exports intentLabels in zh-CN colloquial copy", () => {
    expect(brainTheme.intentLabels.ingest).toBe("记住这个");
    expect(brainTheme.intentLabels.skip).toBe("先不用");
    expect(brainTheme.intentLabels.detail).toBe("多说点");
  });

  it("keeps legacy colors export aligned with dark theme", () => {
    expect(colors.primary).toBe(brainTheme.dark.primary);
    expect(colors.background).toBe("#14161C");
  });

  it("keeps legacy copy.intents aligned with intentLabels", () => {
    expect(copy.intents.ingest).toBe("记住这个");
    expect(copy.intents.skip).toBe("先不用");
    expect(copy.intents.explain).toBe("多说点");
  });

  it("defines spacing, radius, typography scales", () => {
    expect(spacing.md).toBe(16);
    expect(radius.md).toBe(16);
    expect(radius.full).toBe(9999);
    expect(typography.title.fontSize).toBe(24);
    expect(typography.hero.lineHeight).toBe(36);
  });

  it("defines font family and weight aliases for Warm Ink typography", () => {
    expect(fontFamily.display).toBe("DM Sans");
    expect(fontFamily.body).toBe("Noto Sans SC");
    expect(fontWeight.semibold).toBe("600");
    expect(typography.body.fontWeight).toBe(fontWeight.regular);
  });

  it("defines opacity and on-primary text tokens", () => {
    expect(opacity.disabled).toBe(0.5);
    expect(textOnPrimary).toBe("#FFFFFF");
  });

  it("defines modeAccent for all user modes", () => {
    expect(getModeAccent("tech_tracker", "dark")).toBe("#6B9FFF");
    expect(getModeAccent("learner", "light")).toBe("#7B6FE8");
    expect(getThemeColors("dark").surface).toBe("#1E2129");
  });

  it("includes semantic status colors in both themes", () => {
    expect(brainTheme.dark.border).toBe("#FFFFFF12");
    expect(brainTheme.dark.warning).toBe("#E8B86D");
    expect(brainTheme.light.error).toBe("#D45D6F");
    expect(brainTheme.dark.surfaceMuted).toBe("#252932");
  });
});
