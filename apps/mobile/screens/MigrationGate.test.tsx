/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
    }) {
      return React.createElement(
        tag,
        { "data-testid": testID, onClick: onPress },
        children,
      );
    };
  return {
    View: RN("div"),
    Text: RN("span"),
    Pressable: RN("button"),
    StyleSheet: { create: (s: object) => s },
  };
});

import { MigrationGate } from "../boot/MigrationGate";

describe("MigrationGate", () => {
  afterEach(() => cleanup());

  it("does not render LivingBrainHome while migrating", () => {
    render(<MigrationGate status="migrating" schemaVersion={1} />);
    expect(screen.getByTestId("migration-gate-screen")).toBeTruthy();
    expect(screen.queryByTestId("living-brain-home")).toBeNull();
  });

  it("shows retry UI on migration_error", () => {
    const onRetry = vi.fn();
    render(
      <MigrationGate
        status="migration_error"
        schemaVersion={1}
        errorMessage="SchemaMigrationError"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId("migration-error-screen")).toBeTruthy();
    screen.getByTestId("migration-retry").click();
    expect(onRetry).toHaveBeenCalled();
  });
});
