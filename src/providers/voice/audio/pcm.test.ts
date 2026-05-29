import { describe, expect, it } from "vitest";
import {
  REALTIME_SAMPLE_RATE,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  downsampleTo24k,
  float32ToPcm16,
  pcm16ToFloat32,
} from "./pcm";

describe("pcm utilities", () => {
  it("round-trips pcm16 through base64", () => {
    const original = float32ToPcm16(new Float32Array([0, 0.5, -0.5]));
    const encoded = arrayBufferToBase64(original.buffer);
    const decoded = new Int16Array(base64ToArrayBuffer(encoded));
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it("downsamples 48k to 24k", () => {
    const input = new Float32Array([0, 1, 0, -1, 0, 1]);
    const output = downsampleTo24k(input, 48_000);
    expect(output.length).toBe(3);
    expect(output[0]).toBe(0);
    expect(output[1]).toBe(0);
    expect(output[2]).toBe(0);
  });

  it("keeps sample rate when already 24k", () => {
    const input = new Float32Array([0.25, -0.25]);
    const output = downsampleTo24k(input, REALTIME_SAMPLE_RATE);
    expect(output).toBe(input);
  });

  it("converts pcm16 back to float32", () => {
    const pcm = float32ToPcm16(new Float32Array([0.5]));
    const float32 = pcm16ToFloat32(pcm);
    expect(float32[0]).toBeCloseTo(0.5, 2);
  });
});
