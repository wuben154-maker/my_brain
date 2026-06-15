/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { InMemoryGraphRepository } from "@my-brain/core";
import * as ingestModule from "@my-brain/core";

import { setMobileUrlGuardForTests } from "./guardedCapture";
import {
  intakeSharePayload,
  intakeVoiceNoteShareMock,
  M3_VOICE_SHARE_DISABLED,
} from "./shareIntake";

describe("shareIntake — mock share payload → provisional", () => {
  afterEach(() => {
    setMobileUrlGuardForTests(null);
  });

  it("M3 voice share path stays disabled", () => {
    expect(M3_VOICE_SHARE_DISABLED).toBe(true);
    const result = intakeVoiceNoteShareMock();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_INTAKE_VOICE_DISABLED");
      expect(result.hint).toContain("voice_disconnected");
    }
  });

  it("android url payload runs UrlFetchGuard and creates provisional only", async () => {
    const graph = new InMemoryGraphRepository();
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    setMobileUrlGuardForTests({
      resolveDns: async () => ["93.184.216.34"],
      fetch: async () => ({ status: 200, body: new TextEncoder().encode("ok") }),
    });

    const result = await intakeSharePayload(
      {
        platform: "android",
        payloadKind: "url",
        url: "https://example.com/share",
        title: "Chrome 分享",
        sourceApp: "com.android.chrome",
      },
      { graph },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.status).toBe("pending");
      expect(result.candidate.linkUrl).toBe("https://example.com/share");
      expect(result.linkFetch?.ok).toBe(true);
    }
    expect(graph.countVisibleNodes()).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SSRF-denied url still yields validation error before fetch", async () => {
    const graph = new InMemoryGraphRepository();

    const result = await intakeSharePayload(
      {
        platform: "ios",
        payloadKind: "url",
        url: "http://example.com/insecure",
        title: "bad",
      },
      { graph },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_PAYLOAD_URL_INVALID");
    }
    expect(graph.countVisibleNodes()).toBe(0);
  });

  it("ios image payload uses OCR mock boundary — no transcript on failure", async () => {
    const graph = new InMemoryGraphRepository();
    const spy = vi.spyOn(ingestModule, "applyIngestCreate");

    const result = await intakeSharePayload(
      {
        platform: "ios",
        payloadKind: "image",
        mime: "image/jpeg",
      },
      { graph },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.sourceType).toBe("image_mock");
      expect(result.candidate.summary).toContain("可编辑");
      expect(result.candidate.evidenceRefs[0]).toContain("share-image://");
    }
    expect(graph.countVisibleNodes()).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("ios image with title uses title as editable summary when OCR fails", async () => {
    const graph = new InMemoryGraphRepository();

    const result = await intakeSharePayload(
      {
        platform: "ios",
        payloadKind: "image",
        mime: "image/jpeg",
        title: "相册截图",
      },
      { graph },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.summary).toBe("相册截图");
      expect(result.candidate.evidenceRefs[0]).toContain("share-image://");
    }
  });

  it("malformed payload returns safe error without permanent node", async () => {
    const graph = new InMemoryGraphRepository();

    const result = await intakeSharePayload({ platform: "nope" }, { graph });

    expect(result.ok).toBe(false);
    expect(graph.countVisibleNodes()).toBe(0);
  });

  it("text payload creates provisional text candidate", async () => {
    const graph = new InMemoryGraphRepository();

    const result = await intakeSharePayload(
      {
        platform: "android",
        payloadKind: "text",
        title: "生活想法",
        sourceApp: "com.example.notes",
      },
      { graph },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.candidate.sourceType).toBe("text");
      expect(result.candidate.summary).toBe("生活想法");
    }
    expect(graph.countVisibleNodes()).toBe(0);
  });

  it("secret field in payload is rejected", async () => {
    const graph = new InMemoryGraphRepository();

    const result = await intakeSharePayload(
      {
        platform: "ios",
        payloadKind: "text",
        title: "x",
        token: "long-lived-secret",
      },
      { graph },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHARE_PAYLOAD_SECRET_FIELD");
    }
  });
});
