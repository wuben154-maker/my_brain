import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface AppJson {
  expo?: {
    icon?: string;
    splash?: { image?: string; backgroundColor?: string };
    android?: {
      package?: string;
      adaptiveIcon?: { foregroundImage?: string; backgroundColor?: string };
      permissions?: string[];
      intentFilters?: Array<{ action?: string; data?: Array<{ mimeType?: string; scheme?: string }> }>;
    };
    ios?: {
      bundleIdentifier?: string;
      infoPlist?: Record<string, string | boolean>;
    };
    plugins?: unknown[];
  };
}

function readAppJson(): AppJson {
  return JSON.parse(readFileSync(join(__dirname, "app.json"), "utf8")) as AppJson;
}

describe("S13 app config readiness", () => {
  it("declares Expo app icon, splash, and adaptive icon", () => {
    const app = readAppJson().expo;
    expect(app?.icon).toBe("./assets/icon.png");
    expect(app?.splash?.image).toBe("./assets/splash-icon.png");
    expect(app?.android?.adaptiveIcon?.foregroundImage).toBe("./assets/adaptive-icon.png");
    expect(app?.android?.adaptiveIcon?.backgroundColor).toBe("#14161C");
  });

  it("declares stable Android and iOS identifiers", () => {
    const app = readAppJson().expo;
    expect(app?.android?.package).toBe("app.mybrain.personal");
    expect(app?.ios?.bundleIdentifier).toBe("app.mybrain.personal");
  });

  it("uses dev-client runtime rather than Expo Go as the S13 path", () => {
    const app = readAppJson().expo;
    expect(JSON.stringify(app?.plugins ?? [])).toContain("expo-dev-client");
  });
});
