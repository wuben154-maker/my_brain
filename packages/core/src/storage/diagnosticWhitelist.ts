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
  platform?: string;
}

const FORBIDDEN_EXPORT_KEYS = [
  "intro",
  "title",
  "body",
  "transcript",
  "apiKey",
  "api_key",
  "token",
  "secret",
  "correctionNote",
  "correction_note",
  "concept",
  "summary",
] as const;

const ALLOWED_EXPORT_KEYS = new Set([
  "intent",
  "outcome",
  "reasonCode",
  "userMode",
  "ts",
  "schemaVersion",
  "appVersion",
  "platform",
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
  return violations;
}
