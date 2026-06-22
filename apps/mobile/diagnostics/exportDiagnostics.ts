import { Platform, Share } from "react-native";
import Constants from "expo-constants";

import {
  buildDiagnosticExportDocument,
  scanExportPayloadForViolations,
  serializeDiagnosticExportDocument,
  type DiagnosticEvent,
  type DiagnosticExportContext,
} from "@my-brain/core";

import { getDiagnosticRoute } from "./crashRouteContext";
import { getStorageSession } from "../storage/storageSession";

export type DiagnosticExportStatus =
  | { state: "idle" }
  | { state: "degraded"; message: string }
  | { state: "ready"; message: string }
  | { state: "error"; message: string };

export function resolveDiagnosticExportContext(): DiagnosticExportContext {
  const { route, screen } = getDiagnosticRoute();
  const nativeBuild = Constants.nativeBuildVersion;
  return {
    appVersion: Constants.expoConfig?.version ?? "0.0.0",
    buildNumber:
      typeof nativeBuild === "string" && nativeBuild.trim().length > 0
        ? nativeBuild
        : "dev/mock",
    platform: Platform.OS,
    route,
    screen,
  };
}

export function buildDiagnosticExportPayload(): {
  ok: true;
  json: string;
  eventCount: number;
} | {
  ok: false;
  status: DiagnosticExportStatus;
} {
  const session = getStorageSession();
  if (!session) {
    return {
      ok: false,
      status: {
        state: "degraded",
        message: "存储尚未就绪（MigrationGate 未完成）。诊断导出不可用。",
      },
    };
  }

  const context = resolveDiagnosticExportContext();
  const events = session.storage.listDiagnosticEvents() as DiagnosticEvent[];
  const document = buildDiagnosticExportDocument(events, context);
  const json = serializeDiagnosticExportDocument(document);
  const violations = scanExportPayloadForViolations(json);
  if (violations.length > 0) {
    return {
      ok: false,
      status: {
        state: "error",
        message: `导出扫描失败：含禁止字段 (${violations.join(", ")})`,
      },
    };
  }

  session.storage.appendDiagnosticEvent({
    intent: "diagnostic_export",
    outcome: "ok",
    reasonCode: "export_ok",
    metadata: {
      route: context.route ?? "unknown",
      screen: context.screen ?? "unknown",
      eventCount: document.events.length,
    },
  });

  return { ok: true, json, eventCount: document.events.length };
}

export async function collectAndShareDiagnosticExport(): Promise<DiagnosticExportStatus> {
  const result = buildDiagnosticExportPayload();
  if (!result.ok) {
    return result.status;
  }

  await Share.share({
    message: result.json,
    title: "mybrain-diagnostic-export.json",
  });

  return {
    state: "ready",
    message: `已导出 ${result.eventCount} 条诊断事件（不含知识正文/transcript/画像敏感字段）。`,
  };
}
