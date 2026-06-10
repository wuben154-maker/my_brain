/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanionShell } from "@/components/companion/CompanionShell";

describe("CompanionShell", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps radar, review, and action slots mounted in idle mode", () => {
    render(createElement(CompanionShell));

    expect(screen.getByTestId("companion-shell")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-surface").getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(screen.getByTestId("companion-shell-radar-slot")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-curation-slot")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-review-slot")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-action-slot")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-review-entry-carrier")).toBeTruthy();
    expect(screen.queryByTestId("companion-shell-close")).toBeNull();
    expect(screen.queryByTestId("companion-shell-back")).toBeNull();
  });

  it("renders the active slot with consistent close and back controls", () => {
    const onBack = vi.fn();
    const onClose = vi.fn();

    render(
      createElement(CompanionShell, {
        activeSlot: "radar",
        radar: createElement("p", null, "今日 top 3"),
        onBack,
        onClose,
      }),
    );

    expect(screen.getByTestId("companion-shell").getAttribute("data-active-slot")).toBe(
      "radar",
    );
    expect(screen.getByText("今日 top 3")).toBeTruthy();
    expect(screen.getByTestId("companion-shell-radar-slot").getAttribute("data-slot-state")).toBe(
      "active",
    );
    expect(screen.getByTestId("companion-shell-review-slot").hasAttribute("hidden")).toBe(
      true,
    );

    fireEvent.click(screen.getByTestId("companion-shell-back"));
    fireEvent.click(screen.getByTestId("companion-shell-close"));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
