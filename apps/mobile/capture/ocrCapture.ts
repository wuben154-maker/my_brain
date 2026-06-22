/**
 * Minimal image OCR capture — tries native recognition when available;
 * falls back to file/image metadata + editable placeholder (no image bytes persisted).
 */
import type { ImageCaptureMetadata } from "@my-brain/core";

export interface NativeOcrResult {
  recognizedText: string | null;
  degradedReason?: string;
}

/** Native OCR hook — unstable on some RN builds; returns null to use metadata placeholder. */
export async function recognizeImageText(
  _imageRef: string,
  _metadata?: ImageCaptureMetadata,
): Promise<NativeOcrResult> {
  return {
    recognizedText: null,
    degradedReason: "native_ocr_unavailable",
  };
}

export function imageMetadataFromShare(input: {
  mime?: string;
  title?: string;
  imageRef: string;
}): ImageCaptureMetadata {
  const fileName = input.title?.trim() || input.imageRef.split("/").pop() || undefined;
  return {
    mime: input.mime,
    fileName,
  };
}
