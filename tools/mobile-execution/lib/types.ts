export type StageId =
  | "M0"
  | "M1"
  | "M2"
  | "M3"
  | "M4"
  | "M5"
  | "M6"
  | "M7A"
  | "M7B"
  | "M7";

export type Verdict = "PASS" | "FAIL" | "NEEDS_DEVICE_EVIDENCE" | "HARD_STOP";

export type CheckCategory =
  | "sequence"
  | "report"
  | "commands"
  | "forbidden"
  | "deviceEvidence";

export interface CheckResult {
  id: string;
  category: CheckCategory;
  verdict: Verdict;
  message: string;
}

export interface ExecutionState {
  currentPhase: string;
  status: string;
  lastPassedPhase: string | null;
  allowedNextAction: string;
  reports: Record<
    string,
    {
      path: string;
      verdict: string;
      verifiedAt: string;
      notes?: string;
    }
  >;
  hardStop: {
    phase: string;
    reason: string;
    createdAt: string;
    nextRequiredAction?: string;
  } | null;
}

export interface ParsedReport {
  path: string;
  exists: boolean;
  raw: string;
  verdict: string | null;
  fields: {
    stage: boolean;
    verdict: boolean;
    date: boolean;
    executor: boolean;
    supervisor: boolean;
    enter: boolean;
    exit: boolean;
    commands: boolean;
    tests: boolean;
    commit: boolean;
    risks: boolean;
    nextPhase: boolean;
    signoff: boolean;
  };
  knowledgeOsStatus: "merged" | "waiver" | "missing" | "unknown";
  claimsDevicePerfPass: boolean;
  degradedVoiceEvidenceCount: number;
  m2EvidenceKeys: string[];
  smokeRecords: Array<Record<string, string>>;
  reportLinks: string[];
  expoEvidenceOk: boolean;
}

export interface GateContext {
  root: string;
  stage: StageId;
  executeCommands: boolean;
  productPlanPath: string;
  guardrailsPath: string;
  gateSpecPath: string;
  statePath: string;
  state: ExecutionState | null;
  stageSpecPath: string | null;
  reportPath: string;
  parsedReport: ParsedReport | null;
  prevReportPath: string | null;
  prevParsedReport: ParsedReport | null;
}

export const VALID_STAGES: readonly StageId[] = [
  "M0",
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M7A",
  "M7B",
  "M7",
] as const;

export const M7_REPORT_CHAIN: readonly string[] = [
  "M0",
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M7A",
  "M7B",
] as const;

export const REPORT_REQUIRED_FIELDS: readonly string[] = [
  "阶段",
  "判定",
  "日期",
  "执行者",
  "监督者",
  "Enter",
  "Exit",
  "命令证据",
  "测试",
  "Commit",
  "风险",
  "下一阶段",
  "签核",
] as const;

export const M2_VERIFIER_KEYS: readonly string[] = [
  "migration_gate",
  "kill_process_recovery",
  "diagnostic_whitelist",
  "provider_status_panel",
  "ingest_proposal_persist",
  "android_backup_exclude",
  "ios_backup_exclude",
  "degraded_mode_layering",
] as const;

export const M4_SSRF_FIXTURE_IDS: readonly string[] = [
  "ssrf-http-scheme",
  "ssrf-port-80",
  "ssrf-ipv4-literal",
  "ssrf-localhost",
  "ssrf-dns-rebind",
  "ssrf-redirect-private",
  "ssrf-redirect-limit",
  "ssrf-ok-public",
] as const;

export const SMOKE_REQUIRED_FIELDS: readonly string[] = [
  "device",
  "build",
  "path",
  "result",
  "artifact",
] as const;

export const VERDICT_PRIORITY: Record<Verdict, number> = {
  PASS: 0,
  NEEDS_DEVICE_EVIDENCE: 1,
  FAIL: 2,
  HARD_STOP: 3,
};

export const EXIT_CODES: Record<Verdict, number> = {
  PASS: 0,
  FAIL: 1,
  NEEDS_DEVICE_EVIDENCE: 2,
  HARD_STOP: 3,
};
