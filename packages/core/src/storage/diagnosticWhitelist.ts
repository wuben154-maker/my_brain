/** Ring buffer / diagnostic export whitelist — M2 hard gate. */
export type DiagnosticOutcome = "ok" | "fail" | "degraded" | "skipped";

export interface DiagnosticEvent {
  intent: string;
  outcome: DiagnosticOutcome;
  reasonCode: string;
  userMode?: string;
  ts?: string;
  schemaVersion?: number;
  appVersion?: string;
  buildNumber?: string;
  platform?: string;
  /** Non-sensitive screen/route slug for crash localization — no PII. */
  route?: string;
  screen?: string;
}

export const DIAGNOSTIC_EXPORT_SCHEMA_VERSION = 1;

export interface DiagnosticExportContext {
  appVersion: string;
  buildNumber?: string;
  platform: string;
  route?: string;
  screen?: string;
}

export interface DiagnosticExportDocument {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  buildNumber?: string;
  platform: string;
  route?: string;
  screen?: string;
  events: DiagnosticEvent[];
}

const FORBIDDEN_EXPORT_KEYS = [
  "intro",
  "title",
  "body",
  "transcript",
  "article",
  "articleText",
  "article_text",
  "rawArticle",
  "raw_audio",
  "rawAudio",
  "audio",
  "apiKey",
  "api_key",
  "token",
  "secret",
  "correctionNote",
  "correction_note",
  "profileProse",
  "profile_prose",
  "concept",
  "summary",
  "nodeIntro",
  "nodeTitle",
] as const;

const ALLOWED_EXPORT_KEYS = new Set([
  "intent",
  "outcome",
  "reasonCode",
  "userMode",
  "ts",
  "schemaVersion",
  "appVersion",
  "buildNumber",
  "platform",
  "route",
  "screen",
]);

export function isWhitelistedDiagnosticEvent(
  event: Record<string, unknown>,
): boolean {
  for (const key of Object.keys(event)) {
    if (!ALLOWED_EXPORT_KEYS.has(key)) {
      return false;
    }
    const lower = key.toLowerCase();
    if (FORBIDDEN_EXPORT_KEYS.some((f) => lower.includes(f.toLowerCase()))) {
      return false;
    }
    const value = event[key];
    if (typeof value === "string" && containsSensitiveText(value)) {
      return false;
    }
  }
  return (
    typeof event.intent === "string" &&
    typeof event.outcome === "string" &&
    typeof event.reasonCode === "string"
  );
}

function containsSensitiveText(value: string): boolean {
  if (value.length > 120) {
    return true;
  }
  if (/sk-[a-zA-Z0-9]{10,}/.test(value)) {
    return true;
  }
  if (/Bearer\s+/i.test(value)) {
    return true;
  }
  return false;
}

export function sanitizeDiagnosticExport(
  events: DiagnosticEvent[],
): DiagnosticEvent[] {
  return events.filter((event) =>
    isWhitelistedDiagnosticEvent(event as unknown as Record<string, unknown>),
  );
}

export function scanExportPayloadForViolations(payload: string): string[] {
  const violations: string[] = [];
  const lower = payload.toLowerCase();
  for (const key of FORBIDDEN_EXPORT_KEYS) {
    if (lower.includes(`"${key.toLowerCase()}"`)) {
      violations.push(key);
    }
  }
  if (/sk-[a-zA-Z0-9]{10,}/.test(payload)) {
    violations.push("api_key_pattern");
  }
  if (/Bearer\s+[a-zA-Z0-9._-]{8,}/i.test(payload)) {
    violations.push("bearer_token_pattern");
  }
  return violations;
}

/** Attach non-sensitive crash/export metadata without widening event payloads. */
export function enrichDiagnosticEventsForExport(
  events: DiagnosticEvent[],
  context: DiagnosticExportContext,
): DiagnosticEvent[] {
  return sanitizeDiagnosticExport(events).map((event) => ({
    ...event,
    schemaVersion: event.schemaVersion ?? DIAGNOSTIC_EXPORT_SCHEMA_VERSION,
    appVersion: context.appVersion,
    buildNumber: context.buildNumber,
    platform: context.platform,
    route: event.route ?? context.route,
    screen: event.screen ?? context.screen,
  }));
}

export function buildDiagnosticExportDocument(
  events: DiagnosticEvent[],
  context: DiagnosticExportContext,
): DiagnosticExportDocument {
  const exportedAt = new Date().toISOString();
  return {
    schemaVersion: DIAGNOSTIC_EXPORT_SCHEMA_VERSION,
    exportedAt,
    appVersion: context.appVersion,
    buildNumber: context.buildNumber,
    platform: context.platform,
    route: context.route,
    screen: context.screen,
    events: enrichDiagnosticEventsForExport(events, context),
  };
}

export function serializeDiagnosticExportDocument(
  document: DiagnosticExportDocument,
): string {
  return JSON.stringify(document, null, 2);
}
