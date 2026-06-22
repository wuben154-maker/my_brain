import { describe, expect, it } from "vitest";

import {
  getDiagnosticRoute,
  resetDiagnosticRouteForTests,
  setDiagnosticRoute,
} from "./crashRouteContext";

describe("crashRouteContext", () => {
  it("tracks non-sensitive route slugs for export metadata", () => {
    resetDiagnosticRouteForTests();
    expect(getDiagnosticRoute().route).toBe("living-brain-home");
    setDiagnosticRoute("settings-screen", "SettingsScreen");
    expect(getDiagnosticRoute()).toEqual({
      route: "settings-screen",
      screen: "SettingsScreen",
    });
  });
});
