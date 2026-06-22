import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

interface AppJson {
  expo?: {
    android?: {
      permissions?: string[];
      intentFilters?: Array<{
        action?: string;
        category?: string[];
        data?: Array<{ mimeType?: string; scheme?: string }>;
      }>;
    };
    ios?: {
      infoPlist?: Record<string, string | boolean>;
    };
  };
}

function readAppJson(): AppJson {
  return JSON.parse(readFileSync(join(__dirname, "app.json"), "utf8")) as AppJson;
}

describe("S13 native runtime declarations", () => {
  it("declares microphone permission on both platforms", () => {
    const app = readAppJson().expo;
    expect(app?.android?.permissions).toContain("android.permission.RECORD_AUDIO");
    expect(String(app?.ios?.infoPlist?.NSMicrophoneUsageDescription ?? "")).toContain("麦克风");
  });

  it("declares Android SEND filters for text, image, and https URL intake", () => {
    const filters = readAppJson().expo?.android?.intentFilters ?? [];
    const sendFilters = filters.filter((filter) => filter.action === "SEND");
    const data = sendFilters.flatMap((filter) => filter.data ?? []);

    expect(data.map((entry) => entry.mimeType)).toContain("text/plain");
    expect(data.map((entry) => entry.mimeType)).toContain("image/*");
    expect(data.some((entry) => entry.scheme === "https")).toBe(true);
  });
});
