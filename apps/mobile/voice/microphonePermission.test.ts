import { describe, expect, it } from "vitest";

import {
  createMemoryMicrophonePermissionPort,
  createDeviceMicrophonePermissionPort,
} from "./microphonePermission";

describe("microphonePermission", () => {
  it("memory port grants on request from undetermined", async () => {
    const port = createMemoryMicrophonePermissionPort("undetermined");
    expect(await port.getStatus()).toBe("undetermined");
    expect(await port.request()).toBe("granted");
    expect(await port.getStatus()).toBe("granted");
  });

  it("device port exposes Android/iOS adapter surface", () => {
    expect(createDeviceMicrophonePermissionPort()).toMatchObject({
      getStatus: expect.any(Function),
      request: expect.any(Function),
    });
  });
});
