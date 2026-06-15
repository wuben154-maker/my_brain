/**
 * M4 OCR mock boundary — on-device OCR preferred; cloud OCR disabled unless opt-in.
 * Never persist full transcript / raw OCR text to long-term graph layers.
 */

import { captureOcrFixture, type CaptureIngestGateDeps } from "./ingestGate.js";
import type { ProvisionalCandidate } from "./types.js";

export const OCR_POLICY = {
  /** Default path per M4 spec — native on-device OCR when available. */
  onDevicePreferred: true,
  /** Cloud OCR requires explicit user opt-in; mock/prep keeps this false. */
  cloudOcrEnabled: false,
} as const;

export type OcrAttemptStatus = "success" | "failed" | "skipped_cloud_disabled";

export interface OcrAttemptResult {
  status: OcrAttemptStatus;
  /** Short editable summary only — never full OCR transcript. */
  summary: string;
  imageRef: string;
  /** When OCR fails, user may edit this placeholder in queue UI. */
  editablePlaceholder: boolean;
}

const FAILED_SUMMARY_PLACEHOLDER = "（可编辑）截图已保存，请补充摘要";

const MAX_OCR_SUMMARY_LEN = 120;

function truncateSummary(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= MAX_OCR_SUMMARY_LEN) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_OCR_SUMMARY_LEN - 1)}…`;
}

/**
 * Mock on-device OCR attempt. Cloud path is blocked unless OCR_POLICY.cloudOcrEnabled.
 */
export function attemptOnDeviceOcr(input: {
  imageRef: string;
  /** Mock hook — production uses native OCR module. */
  mockOcrText?: string | null;
  preferCloud?: boolean;
}): OcrAttemptResult {
  if (input.preferCloud && !OCR_POLICY.cloudOcrEnabled) {
    return {
      status: "skipped_cloud_disabled",
      summary: FAILED_SUMMARY_PLACEHOLDER,
      imageRef: input.imageRef,
      editablePlaceholder: true,
    };
  }

  const raw = input.mockOcrText ?? null;
  if (!raw || !raw.trim()) {
    return {
      status: "failed",
      summary: FAILED_SUMMARY_PLACEHOLDER,
      imageRef: input.imageRef,
      editablePlaceholder: true,
    };
  }

  return {
    status: "success",
    summary: truncateSummary(raw),
    imageRef: input.imageRef,
    editablePlaceholder: false,
  };
}

/** Build provisional candidate from OCR attempt — image ref only, no transcript persistence. */
export function buildOcrProvisionalCandidate(
  ocr: OcrAttemptResult,
  deps: CaptureIngestGateDeps,
): ProvisionalCandidate {
  return captureOcrFixture(
    {
      summary: ocr.summary,
      imageRef: ocr.imageRef,
      sourceType: "image_mock",
    },
    deps,
  );
}
