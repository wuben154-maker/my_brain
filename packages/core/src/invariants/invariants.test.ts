import { describe, expect, it } from "vitest";

import { CORE_INVARIANTS } from "./index.js";
import { createMockProviderBundle } from "../providers/mockFactories.js";

describe("packages/core invariants placeholder", () => {
  it("lists non-empty product invariants", () => {
    expect(CORE_INVARIANTS.length).toBeGreaterThanOrEqual(5);
    expect(CORE_INVARIANTS).toContain("permanent_nodes_require_user_confirm");
  });

  it("mock provider bundle stays shell-free", () => {
    const bundle = createMockProviderBundle();
    expect(bundle.modes.llm).toBe("mock");
    expect(bundle.voice.id).toBe("mock-voice");
  });
});
