/**
 * Image share intake helper — delegates to core OCR mock boundary.
 */

import {
  attemptOnDeviceOcr,
  buildOcrProvisionalCandidate,
  type CaptureIngestGateDeps,
  type ProvisionalCandidate,
} from "@my-brain/core";

export interface ShareImageIntakeInput {
  imageRef: string;
  title?: string;
  mime?: string;
  /** Test hook for deterministic OCR outcomes. */
  mockOcrText?: string | null;
}

export function intakeShareImage(
  input: ShareImageIntakeInput,
  deps: CaptureIngestGateDeps,
): ProvisionalCandidate {
  const ocr = attemptOnDeviceOcr({
    imageRef: input.imageRef,
    mockOcrText: input.mockOcrText ?? null,
  });
  const candidate = buildOcrProvisionalCandidate(ocr, deps);
  if (input.title?.trim() && ocr.editablePlaceholder) {
    return {
      ...candidate,
      summary: input.title.trim().slice(0, 256),
    };
  }
  return candidate;
}
