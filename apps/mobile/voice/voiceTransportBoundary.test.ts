import { describe, expect, it } from "vitest";

import { DEFAULT_APP_ENV } from "@my-brain/core";

import {
  createStagingVoiceProviderStub,
  isM3MachineTransportComplete,
  resolveVoiceTransportKind,
  resolveVoiceTransportKindFromEnv,
} from "./voiceTransportBoundary";

describe("voiceTransportBoundary", () => {
  it("marks mock transport as machine-complete for no-key path", () => {
    expect(resolveVoiceTransportKind(false, "mock", false)).toBe("mock");
    expect(resolveVoiceTransportKindFromEnv(DEFAULT_APP_ENV)).toBe("mock");
    expect(isM3MachineTransportComplete("mock")).toBe(true);
  });

  it("does not mark saved key alone as byok_live without transport connect", () => {
    expect(resolveVoiceTransportKind(true, "openai-realtime", false)).toBe("staging_stub");
    expect(isM3MachineTransportComplete("staging_stub")).toBe(false);
  });

  it("marks byok_live only after successful transport connect", () => {
    expect(resolveVoiceTransportKind(true, "openai-realtime", true)).toBe("byok_live");
    expect(isM3MachineTransportComplete("byok_live")).toBe(true);
  });

  it("staging stub documents deferred native provider", () => {
    const stub = createStagingVoiceProviderStub("device-abc123");
    expect(stub.transportKind).toBe("staging_stub");
    expect(stub.note).toContain("NEEDS_DEVICE_EVIDENCE");
    expect(stub.note).toContain("voice_api_key");
  });
});
