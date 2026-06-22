import { describe, expect, it } from "vitest";

import {
  buildDiagnosticExportDocument,
  enrichDiagnosticEventsForExport,
  scanExportPayloadForViolations,
  serializeDiagnosticExportDocument,
} from "./diagnosticWhitelist.js";

describe("diagnostic export document", () => {
  const context = {
    appVersion: "0.1.0",
    buildNumber: "42",
    platform: "ios",
    route: "settings-screen",
    screen: "SettingsScreen",
  };

  it("includes version + route metadata for crash localization", () => {
    const doc = buildDiagnosticExportDocument(
      [{ intent: "crash", outcome: "fail", reasonCode: "unhandled_error" }],
      context,
    );
    expect(doc.appVersion).toBe("0.1.0");
    expect(doc.buildNumber).toBe("42");
    expect(doc.route).toBe("settings-screen");
    expect(doc.events[0]?.route).toBe("settings-screen");
    expect(doc.events[0]?.platform).toBe("ios");
  });

  it("rejects sensitive正文 in serialized export", () => {
    const json = serializeDiagnosticExportDocument(
      buildDiagnosticExportDocument(
        [{ intent: "export", outcome: "ok", reasonCode: "export_ok" }],
        context,
      ),
    );
    const polluted = json.replace(
      '"reasonCode": "export_ok"',
      '"reasonCode": "export_ok", "intro": "节点正文不应出现"',
    );
    expect(scanExportPayloadForViolations(polluted).length).toBeGreaterThan(0);
  });

  it("strips non-whitelisted events during enrich", () => {
    const enriched = enrichDiagnosticEventsForExport(
      [
        { intent: "ok", outcome: "ok", reasonCode: "x" },
        {
          intent: "leak",
          outcome: "fail",
          reasonCode: "y",
          transcript: "用户说了什么",
        } as never,
      ],
      context,
    );
    expect(enriched).toHaveLength(1);
    expect(enriched[0]?.intent).toBe("ok");
  });
});
