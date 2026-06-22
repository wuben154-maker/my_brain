/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

vi.mock("react-native", () => {
  const RN = (tag: string) =>
    function MockComponent({
      children,
      testID,
      onPress,
      value,
      onChangeText,
      placeholder,
    }: {
      children?: React.ReactNode;
      testID?: string;
      onPress?: () => void;
      value?: string;
      onChangeText?: (text: string) => void;
      placeholder?: string;
    }) {
      if (tag === "input") {
        return React.createElement("textarea", {
          "data-testid": testID,
          value,
          placeholder,
          onChange: (e: { target: { value: string } }) => onChangeText?.(e.target.value),
        });
      }
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
    TextInput: RN("input"),
    StyleSheet: { create: (s: object) => s },
  };
});

const mergeRemoteSyncPayloadIntoSession = vi.fn();

vi.mock("../sync/syncHandoff", () => ({
  mergeRemoteSyncPayloadIntoSession: (...args: unknown[]) =>
    mergeRemoteSyncPayloadIntoSession(...args),
}));

vi.mock("../storage/storageSession", () => ({
  getStorageSession: () => ({ storage: {} }),
}));

import { M7BSyncPanel } from "./M7BSyncPanel";

describe("M7BSyncPanel", () => {
  beforeEach(() => {
    mergeRemoteSyncPayloadIntoSession.mockReset();
  });

  afterEach(() => cleanup());

  it("renders M7B sync testIDs and PENDING_DEVICE banner", () => {
    render(<M7BSyncPanel />);
    expect(screen.getByTestId("m7b-sync-conflict-panel")).toBeTruthy();
    expect(screen.getByTestId("m7b-sync-mock-banner").textContent).toContain("PENDING_DEVICE");
    expect(screen.getByTestId("m7b-sync-merge")).toBeTruthy();
    expect(screen.getByTestId("m7b-sync-status")).toBeTruthy();
  });

  it("surfaces conflict UI instead of silent overwrite", () => {
    mergeRemoteSyncPayloadIntoSession
      .mockReturnValueOnce({
        ok: false,
        reason: "conflict",
        errorClass: "SyncConflictError",
        hintCode: "conflict:profile_field:mode-learner",
      })
      .mockReturnValueOnce({
        ok: true,
        provisionalRouted: 1,
        archivedNodeIds: 0,
      });

    render(<M7BSyncPanel />);
    fireEvent.change(screen.getByTestId("m7b-sync-remote-json"), {
      target: { value: '{"sync_manifest":{}}' },
    });
    fireEvent.click(screen.getByTestId("m7b-sync-merge"));

    expect(screen.getByTestId("m7b-keep-local-correction")).toBeTruthy();
    expect(screen.getByTestId("m7b-sync-status").textContent).toMatch(/silent/i);

    fireEvent.click(screen.getByTestId("m7b-keep-local-correction"));
    expect(mergeRemoteSyncPayloadIntoSession).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.any(String),
      "device-local",
      { profileConflict: { strategy: "keep_local" } },
    );
  });
});
