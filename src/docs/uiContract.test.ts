/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanionShell } from "@/components/companion/CompanionShell";
import { ImmersiveScene } from "@/components/shell/ImmersiveScene";

const CONTRACT_PATH = resolve(process.cwd(), "docs/UI_CONTRACT.md");

export const REQUIRED_TEST_IDS = [
  "immersive-scene",
  "graph-pane",
  "voice-orb-region",
  "voice-orb",
  "settings-corner",
  "companion-shell",
  "companion-shell-surface",
  "companion-shell-radar-slot",
  "companion-shell-curation-slot",
  "companion-shell-review-slot",
  "companion-shell-review-entry-carrier",
  "companion-shell-action-slot",
] as const;

const COMPANION_SHELL_TEST_IDS = [
  "companion-shell",
  "companion-shell-surface",
  "companion-shell-radar-slot",
  "companion-shell-curation-slot",
  "companion-shell-review-slot",
  "companion-shell-review-entry-carrier",
  "companion-shell-action-slot",
] as const;

vi.mock("react-force-graph-2d", () => ({
  default: () => createElement("div", { "data-testid": "force-graph-2d-mock" }),
}));

function assertTestIdsPresent(container: HTMLElement, testIds: readonly string[]): void {
  for (const testId of testIds) {
    expect(container.querySelector(`[data-testid="${testId}"]`), testId).toBeTruthy();
  }
}

describe("uiContract", () => {
  afterEach(() => {
    cleanup();
  });

  it("documents the KP-00 required render test ids", () => {
    const contract = readFileSync(CONTRACT_PATH, "utf8");

    for (const testId of REQUIRED_TEST_IDS) {
      expect(contract).toContain(testId);
    }
  });

  it("keeps default, showcase, and legacy fallback paths distinct", () => {
    const contract = readFileSync(CONTRACT_PATH, "utf8");

    expect(contract).toContain("Radar default");
    expect(contract).toContain("?showcase=1");
    expect(contract).toContain("RSS flatten legacy");
    expect(contract).toContain("must never be documented or rendered as the main path");
  });

  it("states Settings is not the only mainflow entry", () => {
    const contract = readFileSync(CONTRACT_PATH, "utf8");

    expect(contract).toContain("Must not be the only entry for Radar, Review, or Action");
    expect(contract).toContain("Do not make Settings the only way");
    expect(contract).toContain("KP-01");
    expect(contract).toContain("KP-03");
  });

  it("documents legacy overlay migration and curation slot IA", () => {
    const contract = readFileSync(CONTRACT_PATH, "utf8");

    expect(contract).toContain("Legacy Overlay Migration Matrix");
    expect(contract).toContain("companion-shell-curation-slot");
    expect(contract).toContain("curation-report-overlay");
    expect(contract).toContain("auxiliary legacy");
  });

  it("renders CompanionShell with all contract test ids in the DOM", () => {
    const { container } = render(createElement(CompanionShell));

    assertTestIdsPresent(container, COMPANION_SHELL_TEST_IDS);
  });

  it("renders ImmersiveScene with all contract test ids in the DOM", () => {
    const { container } = render(createElement(ImmersiveScene));

    assertTestIdsPresent(container, REQUIRED_TEST_IDS);
    expect(screen.getByTestId("companion-shell-surface").getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(screen.getByTestId("companion-shell-review-entry-carrier")).toBeTruthy();
  });
});
