import { describe, expect, it } from "vitest";

import { InMemoryGraphRepository } from "../graph/memoryRepository.js";
import {
  attemptOnDeviceOcr,
  buildOcrProvisionalCandidate,
  OCR_POLICY,
} from "./ocrBoundary.js";

describe("ocrBoundary — on-device preferred, cloud disabled", () => {
  it("OCR_POLICY keeps cloud OCR opt-in only", () => {
    expect(OCR_POLICY.onDevicePreferred).toBe(true);
    expect(OCR_POLICY.cloudOcrEnabled).toBe(false);
  });

  it("successful on-device OCR stores truncated summary only", () => {
    const longText = "A".repeat(200);
    const ocr = attemptOnDeviceOcr({
      imageRef: "file://mock/screenshot.png",
      mockOcrText: longText,
    });
    expect(ocr.status).toBe("success");
    expect(ocr.summary.length).toBeLessThanOrEqual(120);
    expect(ocr.editablePlaceholder).toBe(false);
  });

  it("OCR failure saves image ref + editable placeholder, no transcript", () => {
    const ocr = attemptOnDeviceOcr({
      imageRef: "file://mock/screenshot-fail.png",
      mockOcrText: null,
    });
    expect(ocr.status).toBe("failed");
    expect(ocr.summary).toContain("可编辑");
    expect(ocr.editablePlaceholder).toBe(true);
    expect(ocr.imageRef).toBe("file://mock/screenshot-fail.png");
  });

  it("cloud OCR request is skipped when not opt-in", () => {
    const ocr = attemptOnDeviceOcr({
      imageRef: "file://mock/cloud.png",
      preferCloud: true,
      mockOcrText: "cloud text should not land",
    });
    expect(ocr.status).toBe("skipped_cloud_disabled");
    expect(ocr.summary).not.toContain("cloud text");
    expect(ocr.editablePlaceholder).toBe(true);
  });

  it("buildOcrProvisionalCandidate does not create permanent node", () => {
    const graph = new InMemoryGraphRepository();
    const ocr = attemptOnDeviceOcr({
      imageRef: "file://mock/ocr.png",
      mockOcrText: null,
    });
    const candidate = buildOcrProvisionalCandidate(ocr, { graph });
    expect(candidate.sourceType).toBe("image_mock");
    expect(candidate.summary).toContain("可编辑");
    expect(candidate.evidenceRefs).toEqual(["file://mock/ocr.png"]);
    expect(graph.countVisibleNodes()).toBe(0);
  });
});
