import { describe, expect, it } from "vitest";
import { isTauriRuntime } from "./platform";

describe("isTauriRuntime", () => {
  it("returns false in node test environment", () => {
    expect(isTauriRuntime()).toBe(false);
  });
});
