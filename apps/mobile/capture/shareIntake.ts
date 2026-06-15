/**
 * M4 mock share intake — validated App Group / intent payload → provisional candidate.
 * Does not create permanent nodes; malformed payloads return safe errors.
 */

import type { GraphRepository } from "@my-brain/core";
import {
  captureShareLink,
  createProvisionalCandidate,
  sharePayloadRejectUserHint,
  type CaptureIngestGateDeps,
  type LinkCaptureResult,
  type ProvisionalCandidate,
  type SharePayloadRejectCode,
  type UrlFetchGuardDeps,
  validateSharePayload,
} from "@my-brain/core";

import { getMobileUrlGuard } from "./guardedCapture";
import { intakeShareImage } from "./shareImageIntake";

export type ShareIntakeErrorCode = SharePayloadRejectCode | "SHARE_INTAKE_VOICE_DISABLED";

export interface ShareIntakeOk {
  ok: true;
  candidate: ProvisionalCandidate;
  linkFetch?: LinkCaptureResult["fetchResult"];
}

export interface ShareIntakeFail {
  ok: false;
  code: ShareIntakeErrorCode;
  hint: string;
}

export type ShareIntakeResult = ShareIntakeOk | ShareIntakeFail;

export interface ShareIntakeDeps {
  graph: GraphRepository;
  urlGuard?: UrlFetchGuardDeps;
}

/** M3 not PASS — voice note share payloads stay disabled (mock metadata only). */
export const M3_VOICE_SHARE_DISABLED = true;

function fail(code: ShareIntakeErrorCode, hint: string): ShareIntakeFail {
  return { ok: false, code, hint };
}

function summaryFromPayload(
  title: string | undefined,
  fallback: string,
): string {
  return (title?.trim() || fallback).slice(0, 256);
}

/**
 * Convert raw share JSON to provisional candidate.
 * URL → UrlFetchGuard; image → on-device OCR mock boundary; text → provisional only.
 */
export async function intakeSharePayload(
  raw: unknown,
  deps: ShareIntakeDeps,
): Promise<ShareIntakeResult> {
  const validated = validateSharePayload(raw);
  if (!validated.ok) {
    return fail(validated.code, sharePayloadRejectUserHint(validated.code));
  }

  const { payload } = validated;
  const gateDeps: CaptureIngestGateDeps = {
    graph: deps.graph,
    urlGuard: deps.urlGuard ?? getMobileUrlGuard(),
  };

  if (payload.payloadKind === "url" && payload.url) {
    const { candidate, fetchResult } = await captureShareLink(
      {
        summary: summaryFromPayload(payload.title, payload.url),
        linkUrl: payload.url,
        sourceType: "link",
      },
      gateDeps,
    );
    return { ok: true, candidate, linkFetch: fetchResult };
  }

  if (payload.payloadKind === "image") {
    const imageRef =
      payload.url ??
      `share-image://${payload.platform}/${payload.mime ?? "image"}/${payload.capturedAt ?? "now"}`;
    const candidate = intakeShareImage(
      {
        imageRef,
        title: payload.title,
        mime: payload.mime,
      },
      gateDeps,
    );
    return { ok: true, candidate };
  }

  if (payload.payloadKind === "text") {
    const candidate = createProvisionalCandidate({
      sourceType: "text",
      summary: summaryFromPayload(payload.title, "分享文字"),
      evidenceRefs: payload.sourceApp ? [`app:${payload.sourceApp}`] : [],
      linkUrl: payload.url,
    });
    const before = deps.graph.countVisibleNodes();
    if (deps.graph.countVisibleNodes() !== before) {
      return fail("SHARE_PAYLOAD_INVALID", sharePayloadRejectUserHint("SHARE_PAYLOAD_INVALID"));
    }
    return { ok: true, candidate };
  }

  return fail("SHARE_PAYLOAD_INVALID", sharePayloadRejectUserHint("SHARE_PAYLOAD_INVALID"));
}

/** Voice note share is mock/disabled until M3-GATE PASS. */
export function intakeVoiceNoteShareMock(): ShareIntakeFail {
  return {
    ok: false,
    code: "SHARE_INTAKE_VOICE_DISABLED",
    hint: "voice_disconnected：M3 未 PASS，语音笔记分享已禁用",
  };
}
