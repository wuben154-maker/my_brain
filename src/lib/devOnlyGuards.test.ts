/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("devOnlyGuards", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("shouldEnableDemoModes is false when DEV is not a dev build", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    vi.resetModules();
    const { shouldEnableDemoModes, canUseLegacyNonVoiceGraphCreate } =
      await import("@/lib/devOnlyGuards");
    expect(shouldEnableDemoModes()).toBe(false);
    expect(canUseLegacyNonVoiceGraphCreate()).toBe(false);
  });

  it("isGraphDemoMode is false in non-dev builds even with graphDemo query", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("PROD", true);
    vi.resetModules();
    const { isGraphDemoMode } = await import("@/lib/graphDemoSeed");
    window.location.search = "?graphDemo=1";
    expect(isGraphDemoMode()).toBe(false);
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("shouldEnableDemoModes is true in dev build", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("PROD", false);
    vi.resetModules();
    const { shouldEnableDemoModes, canUseLegacyNonVoiceGraphCreate } =
      await import("@/lib/devOnlyGuards");
    expect(shouldEnableDemoModes()).toBe(true);
    expect(canUseLegacyNonVoiceGraphCreate()).toBe(true);
  });
});
