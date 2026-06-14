export const VALID_STAGES = [
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
];

export const M7_REPORT_CHAIN = [
  "M0",
  "M1",
  "M2",
  "M3",
  "M4",
  "M5",
  "M6",
  "M7A",
  "M7B",
];

export const REPORT_REQUIRED_FIELDS = [
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
];

export const M2_VERIFIER_KEYS = [
  "migration_gate",
  "kill_process_recovery",
  "diagnostic_whitelist",
  "provider_status_panel",
  "ingest_proposal_persist",
  "android_backup_exclude",
  "ios_backup_exclude",
  "degraded_mode_layering",
];

export const M4_SSRF_FIXTURE_IDS = [
  "ssrf-http-scheme",
  "ssrf-port-80",
  "ssrf-ipv4-literal",
  "ssrf-localhost",
  "ssrf-dns-rebind",
  "ssrf-redirect-private",
  "ssrf-redirect-limit",
  "ssrf-ok-public",
];

export const SMOKE_REQUIRED_FIELDS = [
  "device",
  "build",
  "path",
  "result",
  "artifact",
];

export const VERDICT_PRIORITY = {
  PASS: 0,
  NEEDS_DEVICE_EVIDENCE: 1,
  FAIL: 2,
  HARD_STOP: 3,
};

export const EXIT_CODES = {
  PASS: 0,
  FAIL: 1,
  NEEDS_DEVICE_EVIDENCE: 2,
  HARD_STOP: 3,
};
