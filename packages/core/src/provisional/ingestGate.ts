/**
 * M4 ingest gate — capture paths may only create provisional candidates.
 * Permanent graph nodes require confirmCandidate → applyIngestCreate.
 */

import type { GraphRepository } from "../graph/types.js";
import { createProvisionalCandidate } from "./queue.js";
import type { ProvisionalCandidate, ProvisionalSourceType } from "./types.js";
import {
  guardedUrlFetch,
  type SsrfRejectCode,
  type UrlFetchGuardDeps,
  type UrlFetchResult,
} from "./urlFetchGuard.js";

export interface CaptureIngestGateDeps {
  graph: GraphRepository;
  urlGuard?: UrlFetchGuardDeps;
}

export interface LinkCaptureResult {
  candidate: ProvisionalCandidate;
  fetchResult: UrlFetchResult;
}

/** Share / intent link capture — never calls applyIngestCreate. */
export async function captureShareLink(
  input: { summary: string; linkUrl: string; sourceType?: ProvisionalSourceType },
  deps: CaptureIngestGateDeps,
): Promise<LinkCaptureResult> {
  const beforeNodes = deps.graph.countVisibleNodes();
  const fetchResult = await guardedUrlFetch(input.linkUrl, {}, deps.urlGuard ?? {});

  const candidate = createProvisionalCandidate({
    sourceType: input.sourceType ?? "link",
    summary: input.summary,
    linkUrl: input.linkUrl,
    evidenceRefs: [input.linkUrl],
    ssrfRejectCode: fetchResult.ok ? undefined : fetchResult.code,
    fetchHint: fetchResult.ok ? undefined : fetchResult.hint,
    fetchOk: fetchResult.ok,
  });

  if (deps.graph.countVisibleNodes() !== beforeNodes) {
    throw new Error("captureShareLink must not create permanent nodes");
  }
  return { candidate, fetchResult };
}

/** OCR / image mock capture — never calls applyIngestCreate. */
export function captureOcrFixture(
  input: { summary: string; imageRef: string; sourceType?: ProvisionalSourceType },
  deps: CaptureIngestGateDeps,
): ProvisionalCandidate {
  const beforeNodes = deps.graph.countVisibleNodes();
  const candidate = createProvisionalCandidate({
    sourceType: input.sourceType ?? "image_mock",
    summary: input.summary,
    evidenceRefs: [input.imageRef],
  });
  if (deps.graph.countVisibleNodes() !== beforeNodes) {
    throw new Error("captureOcrFixture must not create permanent nodes");
  }
  return candidate;
}

/** Sync import fixture (M7 prep only) — lands in provisional, not permanent. */
export function captureSyncImportFixture(
  input: { summary: string; externalId: string },
  deps: CaptureIngestGateDeps,
): ProvisionalCandidate {
  const beforeNodes = deps.graph.countVisibleNodes();
  const candidate = createProvisionalCandidate({
    sourceType: "project",
    summary: input.summary,
    evidenceRefs: [`sync:${input.externalId}`],
  });
  if (deps.graph.countVisibleNodes() !== beforeNodes) {
    throw new Error("captureSyncImportFixture must not create permanent nodes");
  }
  return candidate;
}

export function ssrfRejectUserHint(code: SsrfRejectCode): string {
  switch (code) {
    case "SSRF_SCHEME_DENIED":
      return "仅支持安全链接（https）";
    case "SSRF_PORT_DENIED":
    case "SSRF_HOST_DENIED":
    case "SSRF_PRIVATE_IP":
    case "SSRF_DNS_PRIVATE":
    case "SSRF_DNS_FAILED":
      return "无法访问该地址";
    case "SSRF_REDIRECT_FINAL_DENIED":
    case "SSRF_REDIRECT_LIMIT":
      return "链接跳转不安全";
    case "SSRF_FETCH_TIMEOUT":
      return "链接抓取超时";
    case "SSRF_RESPONSE_TOO_LARGE":
      return "页面内容过大";
    default:
      return "链接校验失败";
  }
}
