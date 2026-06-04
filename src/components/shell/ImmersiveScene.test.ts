/**
 * @vitest-environment happy-dom
 */
import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ImmersiveScene } from "@/components/shell/ImmersiveScene";

describe("ImmersiveScene (V0)", () => {
  afterEach(() => {
    cleanup();
  });

  it("mounts immersive scene, voice orb, and settings corner", () => {
    render(createElement(ImmersiveScene));
    expect(screen.getByTestId("immersive-scene")).toBeTruthy();
    expect(screen.getByTestId("voice-orb")).toBeTruthy();
    expect(screen.getByTestId("settings-corner")).toBeTruthy();
  });
});
