/**
 * Image share intake helper — native OCR when stable, else metadata + editable placeholder.
 */

import {
  attemptOnDeviceOcr,
  buildOcrProvisionalCandidate,
  type CaptureIngestGateDeps,
  type ProvisionalCandidate,
} from "@my-brain/core";

import { imageMetadataFromShare, recognizeImageText } from "./ocrCapture";

export interface ShareImageIntakeInput {
  imageRef: string;
  title?: string;
  mime?: string;
  /** Test hook for deterministic OCR outcomes — not used on production paths. */
  mockOcrText?: string | null;
}

export async function intakeShareImage(
  input: ShareImageIntakeInput,
  deps: CaptureIngestGateDeps,
): Promise<ProvisionalCandidate> {
  const metadata = imageMetadataFromShare(input);
  const native = input.mockOcrText
    ? { recognizedText: null as string | null }
    : await recognizeImageText(input.imageRef, metadata);

  const ocr = attemptOnDeviceOcr({
    imageRef: input.imageRef,
    recognizedText: input.mockOcrText ?? native.recognizedText,
    metadata,
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
