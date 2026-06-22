import {
  fileExists,
  globStageSpec,
  readJson,
  readPackageDependencies,
  readPackageScripts,
  readText,
  reportPathForStage,
  resolveFromRoot,
} from "./fs-utils.mjs";
import { parseGateReport } from "./report-parser.mjs";
import {
  requirePath,
  requireScript,
  runCommand,
  shouldExecuteCommands,
} from "./run-command.mjs";
import {
  M2_VERIFIER_KEYS as M2_KEYS,
  M4_SSRF_FIXTURE_IDS as M4_FIXTURES,
  M7_REPORT_CHAIN as REPORT_CHAIN,
  SMOKE_REQUIRED_FIELDS as SMOKE_FIELDS,
  VERDICT_PRIORITY,
} from "./types.mjs";

function push(results, check) {
  results.push(check);
}

function worstVerdict(checks) {
  let verdict = "PASS";
  for (const check of checks) {
    if (VERDICT_PRIORITY[check.verdict] > VERDICT_PRIORITY[verdict]) {
      verdict = check.verdict;
    }
  }
  return verdict;
}

function categoryVerdict(checks, category) {
  const subset = checks.filter((check) => check.category === category);
  return subset.length > 0 ? worstVerdict(subset) : "PASS";
}

/** When machine + device checks are green, interim report NEEDS_DEVICE_EVIDENCE may clear. */
function reconcileSequenceReportVerdict(checks) {
  const reportPassCheck = checks.find((check) => check.id === "sequence-current-report-pass");
  if (!reportPassCheck || reportPassCheck.verdict !== "NEEDS_DEVICE_EVIDENCE") {
    return;
  }
  if (
    categoryVerdict(checks, "commands") === "PASS" &&
    categoryVerdict(checks, "deviceEvidence") === "PASS"
  ) {
    reportPassCheck.verdict = "PASS";
    reportPassCheck.message =
      "device evidence satisfied; parent agent must update report verdict to PASS before advancing EXECUTION_STATE";
  }
}

function previousStage(stage) {
  const order = [
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
  const index = order.indexOf(stage);
  if (index <= 0) {
    return null;
  }
  return order[index - 1] ?? null;
}

function allowedActionFor(stage) {
  if (stage === "M7") {
    return "complete";
  }
  return `run_${stage}_only`;
}

function loadReport(root, stage) {
  const rel = reportPathForStage(stage);
  return parseGateReport(rel, readText(resolveFromRoot(root, rel)));
}

function checkRequiredInputs(ctx, results) {
  const required = [
    { id: "input-product-plan", path: ctx.productPlanPath, hardStop: false },
    { id: "input-guardrails", path: ctx.guardrailsPath, hardStop: true },
    { id: "input-gate-spec", path: ctx.gateSpecPath, hardStop: true },
  ];
  for (const item of required) {
    push(results, requirePath(item.id, fileExists(item.path), item.path, item.hardStop));
  }

  if (ctx.stage !== "M0" && !ctx.state) {
    push(results, {
      id: "input-execution-state",
      category: "sequence",
      verdict: "FAIL",
      message: `missing ${ctx.statePath}`,
    });
  }
}

function detectPipelineOverreach(ctx, results) {
  const order = ["M0", "M1", "M2", "M3", "M4", "M5", "M6", "M7A", "M7B"];
  const currentIndex = order.indexOf(ctx.stage);
  for (let i = currentIndex + 1; i < order.length; i += 1) {
    const futureStage = order[i];
    if (!futureStage) {
      continue;
    }
    const futureReport = loadReport(ctx.root, futureStage);
    if (futureReport.exists && futureReport.verdict === "PASS") {
      push(results, {
        id: `forbidden-future-pass-${futureStage}`,
        category: "forbidden",
        verdict: "HARD_STOP",
        message: `${futureStage} report PASS before ${ctx.stage} gate`,
      });
    }
  }
}

function checkM7Sequence(ctx, results) {
  for (const stage of REPORT_CHAIN) {
    const report = loadReport(ctx.root, stage);
    push(results, {
      id: `m7-chain-${stage}`,
      category: "sequence",
      verdict: report.exists && report.verdict === "PASS" ? "PASS" : "FAIL",
      message: `${stage} report must exist with PASS`,
    });
  }

  push(results, {
    id: "m7-report-exists",
    category: "sequence",
    verdict: ctx.parsedReport?.exists ? "PASS" : "FAIL",
    message: ctx.reportPath,
  });

  push(results, {
    id: "m7-report-pass",
    category: "sequence",
    verdict:
      ctx.parsedReport?.exists && ctx.parsedReport.verdict === "PASS"
        ? "PASS"
        : "FAIL",
    message: "M7-GATE report verdict must be PASS",
  });

  if (ctx.parsedReport?.exists) {
    for (const stage of REPORT_CHAIN) {
      const expected = reportPathForStage(stage);
      const linked = ctx.parsedReport.reportLinks.some((link) =>
        link.includes(`${stage}-GATE-report.md`),
      );
      push(results, {
        id: `m7-link-${stage}`,
        category: "report",
        verdict: linked ? "PASS" : "FAIL",
        message: `M7 report must link ${expected}`,
      });
    }
  }
}

function checkSequence(ctx, results) {
  if (ctx.stage === "M7") {
    checkM7Sequence(ctx, results);
    return;
  }

  if (!ctx.state) {
    push(results, {
      id: "sequence-state",
      category: "sequence",
      verdict: "FAIL",
      message: "EXECUTION_STATE.json missing",
    });
    return;
  }

  push(results, {
    id: "sequence-current-phase",
    category: "sequence",
    verdict: ctx.state.currentPhase === ctx.stage ? "PASS" : "FAIL",
    message: `expected currentPhase=${ctx.stage}, got ${ctx.state.currentPhase}`,
  });

  push(results, {
    id: "sequence-allowed-next-action",
    category: "sequence",
    verdict:
      ctx.state.allowedNextAction === allowedActionFor(ctx.stage) ? "PASS" : "FAIL",
    message: `expected allowedNextAction=${allowedActionFor(ctx.stage)}, got ${ctx.state.allowedNextAction}`,
  });

  const prev = previousStage(ctx.stage);
  if (prev) {
    const prevReport = loadReport(ctx.root, prev);
    const prevStateReport = ctx.state.reports[prev];
    push(results, {
      id: "sequence-prev-report-pass",
      category: "sequence",
      verdict:
        prevReport.exists && prevReport.verdict === "PASS" ? "PASS" : "FAIL",
      message: `${prev} report verdict must be PASS`,
    });
    push(results, {
      id: "sequence-last-passed-phase",
      category: "sequence",
      verdict: ctx.state.lastPassedPhase === prev ? "PASS" : "FAIL",
      message: `expected lastPassedPhase=${prev}, got ${String(ctx.state.lastPassedPhase)}`,
    });
    if (prevStateReport && prevStateReport.verdict !== "PASS") {
      push(results, {
        id: "sequence-prev-state-report",
        category: "sequence",
        verdict: "FAIL",
        message: `state.reports.${prev}.verdict must be PASS`,
      });
    }
  }

  push(results, {
    id: "sequence-current-report-exists",
    category: "sequence",
    verdict: ctx.parsedReport?.exists ? "PASS" : "FAIL",
    message: ctx.reportPath,
  });

  push(results, {
    id: "sequence-current-report-pass",
    category: "sequence",
    verdict:
      ctx.parsedReport?.exists && ctx.parsedReport.verdict === "PASS"
        ? "PASS"
        : ctx.parsedReport?.exists && ctx.parsedReport.verdict === "NEEDS_DEVICE_EVIDENCE"
          ? "NEEDS_DEVICE_EVIDENCE"
        : "FAIL",
    message: `current report verdict must be PASS or NEEDS_DEVICE_EVIDENCE (got ${String(ctx.parsedReport?.verdict)})`,
  });

  detectPipelineOverreach(ctx, results);
}

function checkReportFields(ctx, results) {
  if (!ctx.parsedReport?.exists) {
    push(results, {
      id: "report-missing",
      category: "report",
      verdict: "FAIL",
      message: ctx.reportPath,
    });
    return;
  }

  const fieldEntries = Object.entries(ctx.parsedReport.fields);
  for (const [field, present] of fieldEntries) {
    push(results, {
      id: `report-field-${field}`,
      category: "report",
      verdict: present ? "PASS" : "FAIL",
      message: `report field ${field}`,
    });
  }

  if (ctx.stage === "M0") {
    const status = ctx.parsedReport.knowledgeOsStatus;
    const ok = status === "merged" || status === "waiver";
    push(results, {
      id: "m0-doc-registry-knowledge-os",
      category: "report",
      verdict: ok ? "PASS" : "FAIL",
      message: `KNOWLEDGE_OS_VISION.md must be merged or waiver (got ${status})`,
    });
  }

  if (ctx.stage === "M2") {
    for (const key of M2_KEYS) {
      const present = ctx.parsedReport.m2EvidenceKeys.includes(key);
      push(results, {
        id: `m2-evidence-${key}`,
        category: "report",
        verdict: present ? "PASS" : "FAIL",
        message: `M2 report missing verifier key ${key}`,
      });
    }
  }

  if (ctx.parsedReport.verdict === "PASS") {
    const bad = worstVerdict(results.filter((item) => item.category === "report"));
    if (bad !== "PASS") {
      push(results, {
        id: "report-fake-pass",
        category: "forbidden",
        verdict: "HARD_STOP",
        message: "report claims PASS but report checks failed",
      });
    }
  }
}

function grepFixtureIds(filePath, fixtureIds) {
  if (!fileExists(filePath)) {
    return [...fixtureIds];
  }
  const text = readText(filePath) ?? "";
  return fixtureIds.filter((id) => !text.includes(id));
}

function checkM0Commands(ctx, results) {
  const rootPkg = resolveFromRoot(ctx.root, "package.json");
  const rootScripts = readPackageScripts(rootPkg);
  push(results, requireScript("m0-pnpm-check-script", rootScripts, "check", rootPkg));
  push(
    results,
    runCommand("pnpm check", {
      id: "m0-pnpm-check",
      cwd: ctx.root,
      reportClaimsPass: ctx.parsedReport?.verdict === "PASS",
      hardStopOnFailureWhenReportPass: true,
    }),
  );

  const corePkg = resolveFromRoot(ctx.root, "packages/core/package.json");
  const coreScripts = readPackageScripts(corePkg);
  push(
    results,
    requireScript(
      "m0-core-boundary-script",
      coreScripts,
      "lint:boundaries",
      corePkg,
    ),
  );
  if (coreScripts?.["lint:boundaries"]) {
    push(
      results,
      runCommand("pnpm --filter @my-brain/core run lint:boundaries", {
        id: "m0-core-boundary",
        cwd: ctx.root,
        reportClaimsPass: ctx.parsedReport?.verdict === "PASS",
        hardStopOnFailureWhenReportPass: true,
      }),
    );
  }

  const workspace = resolveFromRoot(ctx.root, "pnpm-workspace.yaml");
  push(results, requirePath("m0-workspace", fileExists(workspace), workspace));
  for (const rel of [
    "apps/mobile/package.json",
    "apps/mobile/tsconfig.json",
    "packages/core/package.json",
    "packages/core/tsconfig.json",
  ]) {
    push(results, requirePath(`m0-workspace-${rel}`, fileExists(resolveFromRoot(ctx.root, rel)), rel));
  }

  const mobilePkg = resolveFromRoot(ctx.root, "apps/mobile/package.json");
  const mobileDeps = readPackageDependencies(mobilePkg);
  const requiredMobileDeps = ["expo", "react", "react-native"];
  const missingMobileDeps = requiredMobileDeps.filter(
    (name) => !mobileDeps?.dependencies?.[name],
  );
  push(results, {
    id: "m0-mobile-deps",
    category: "commands",
    verdict: missingMobileDeps.length === 0 ? "PASS" : "FAIL",
    message:
      missingMobileDeps.length === 0
        ? "apps/mobile declares expo/react/react-native"
        : `apps/mobile missing dependencies: ${missingMobileDeps.join(", ")}`,
  });

  const mobileScripts = readPackageScripts(mobilePkg);
  push(results, requireScript("m0-mobile-start-script", mobileScripts, "start", mobilePkg));

  if (ctx.executeCommands && mobileScripts?.["expo:config"]) {
    push(
      results,
      runCommand("pnpm --filter @my-brain/mobile run expo:config", {
        id: "m0-expo-config",
        cwd: ctx.root,
        reportClaimsPass: ctx.parsedReport?.verdict === "PASS",
        hardStopOnFailureWhenReportPass: true,
      }),
    );
  }

  const expoEvidenceOk = ctx.parsedReport?.expoEvidenceOk === true;
  push(results, {
    id: "m0-expo-start",
    category: "commands",
    verdict: expoEvidenceOk ? "PASS" : "FAIL",
    message: expoEvidenceOk
      ? "M0 report documents expo config/start smoke evidence"
      : "M0 report missing expo start/config evidence (gate spec §3.3.1 m0-expo-start)",
  });

  if (ctx.parsedReport?.verdict === "PASS" && !expoEvidenceOk) {
    push(results, {
      id: "m0-expo-fake-pass",
      category: "forbidden",
      verdict: "HARD_STOP",
      message: "report claims PASS but expo start evidence missing",
    });
  }

  push(results, {
    id: "m0-gate-script",
    category: "commands",
    verdict: "PASS",
    message: "pnpm mobile:gate wired",
  });
}

function checkM1Commands(ctx, results) {
  const paths = [
    "docs/evals/mobile-m1-ingest-loop.md",
    "docs/evals/mobile-m1-capture-loop.md",
    "docs/evals/cold-start-fixtures.json",
    "docs/evals/capture-loop-fixtures.json",
    "apps/mobile/components/QuickCaptureFab.tsx",
    "apps/mobile/components/ProvisionalQueueSheet.tsx",
    "apps/mobile/stores/provisionalStore.ts",
    "apps/mobile/screens/LivingBrainHome.tsx",
    "apps/mobile/components/AdaptiveRadar.tsx",
    "apps/mobile/components/ProfileReview.tsx",
    "packages/core/src/provisional/queue.ts",
    "packages/core/src/provisional/queue.test.ts",
    "packages/core/src/graph/nodeBudget.test.ts",
  ];
  for (const rel of paths) {
    push(results, requirePath(`m1-path-${rel}`, fileExists(resolveFromRoot(ctx.root, rel)), rel));
  }

  const coldFixtures = resolveFromRoot(ctx.root, "docs/evals/cold-start-fixtures.json");
  if (fileExists(coldFixtures)) {
    const data = readJson(coldFixtures);
    const count = Array.isArray(data?.fixtures) ? data.fixtures.length : 0;
    push(results, {
      id: "m1-cold-start-fixtures-count",
      category: "commands",
      verdict: count >= 4 ? "PASS" : "FAIL",
      message: `cold-start-fixtures.json needs >=4 entries (got ${count})`,
    });
    const hasMixed = JSON.stringify(data).includes("cold-mixed-learner-life");
    push(results, {
      id: "m1-cold-start-mixed-mode",
      category: "commands",
      verdict: hasMixed ? "PASS" : "FAIL",
      message: "cold-start-fixtures must include mixed mode fixture",
    });
  }

  const captureFixtures = resolveFromRoot(ctx.root, "docs/evals/capture-loop-fixtures.json");
  if (fileExists(captureFixtures)) {
    const data = readJson(captureFixtures);
    const count = Array.isArray(data?.fixtures) ? data.fixtures.length : 0;
    push(results, {
      id: "m1-capture-fixtures-count",
      category: "commands",
      verdict: count >= 1 ? "PASS" : "FAIL",
      message: `capture-loop-fixtures.json needs >=1 entry (got ${count})`,
    });
  }

  const mobilePkg = resolveFromRoot(ctx.root, "apps/mobile/package.json");
  push(results, requireScript("m1-mobile-test-script", readPackageScripts(mobilePkg), "test", mobilePkg));

  if (ctx.executeCommands) {
    push(
      results,
      runCommand("pnpm --filter @my-brain/core test", {
        id: "m1-core-unit",
        cwd: ctx.root,
        reportClaimsPass: ctx.parsedReport?.verdict === "PASS",
        hardStopOnFailureWhenReportPass: true,
      }),
    );
    if (readPackageScripts(mobilePkg)?.test) {
      push(
        results,
        runCommand("pnpm --filter @my-brain/mobile test", {
          id: "m1-mobile-unit",
          cwd: ctx.root,
          reportClaimsPass: ctx.parsedReport?.verdict === "PASS",
          hardStopOnFailureWhenReportPass: true,
        }),
      );
    }
  }

  const nodeBudgetOk =
    ctx.parsedReport?.raw.includes("nodeBudget") ||
    ctx.parsedReport?.raw.includes("node-budget") ||
    ctx.parsedReport?.raw.includes("≤80") ||
    ctx.parsedReport?.raw.includes("<=80");
  push(results, {
    id: "m1-node-budget",
    category: "commands",
    verdict: nodeBudgetOk ? "PASS" : "FAIL",
    message: "M1 report must document home visible node budget ≤80",
  });

  const dualSmoke =
    /Android/i.test(ctx.parsedReport?.raw ?? "") &&
    /iOS/i.test(ctx.parsedReport?.raw ?? "") &&
    (/smoke/i.test(ctx.parsedReport?.raw ?? "") || /主路径/i.test(ctx.parsedReport?.raw ?? ""));
  push(results, {
    id: "m1-dual-smoke",
    category: "commands",
    verdict: dualSmoke ? "PASS" : "FAIL",
    message: "M1 report must document Android + iOS main-path smoke",
  });
}

const M2_IOS_BACKUP_EVIDENCE_ARTIFACT =
  "specs/mobile-app/reports/artifacts/m2-ios-backup-exclusion-device-evidence.json";

function entryEndsWith(path, suffix) {
  return path.endsWith(suffix);
}

function validateM2IosBackupEvidenceArtifact(data) {
  const errors = [];
  if (!data || typeof data !== "object") {
    return { ok: false, errors: ["artifact must be a JSON object"] };
  }
  const artifact = data;
  if (artifact.deviceEvidence !== "present") {
    errors.push('deviceEvidence must be "present"');
  }
  if (artifact.platform !== "ios") {
    errors.push('platform must be "ios"');
  }
  if (!artifact.checkedAt || typeof artifact.checkedAt !== "string") {
    errors.push("checkedAt must be a non-empty ISO timestamp");
  }
  if (!Array.isArray(artifact.files) || artifact.files.length === 0) {
    errors.push("files must be a non-empty array");
    return { ok: false, errors };
  }
  for (const suffix of [".db", "-wal", "-shm"]) {
    const match = artifact.files.find(
      (file) => typeof file?.path === "string" && entryEndsWith(file.path, suffix),
    );
    if (!match) {
      errors.push(`missing file entry ending with ${suffix}`);
      continue;
    }
    if (match.exists !== true) {
      errors.push(`${suffix} file must exist on device`);
    }
    if (match.excludedFromBackup !== true) {
      errors.push(`${suffix} excludedFromBackup must be true`);
    }
    if (match.platform !== "ios") {
      errors.push(`${suffix} entry platform must be ios`);
    }
    if (!match.checkedAt) {
      errors.push(`${suffix} entry checkedAt required`);
    }
  }
  return { ok: errors.length === 0, errors };
}

function loadM2IosDeviceEvidence(root) {
  const artifactPath = resolveFromRoot(root, M2_IOS_BACKUP_EVIDENCE_ARTIFACT);
  if (!fileExists(artifactPath)) {
    return {
      present: false,
      errors: [`missing artifact ${M2_IOS_BACKUP_EVIDENCE_ARTIFACT}`],
    };
  }
  const data = readJson(artifactPath);
  const validation = validateM2IosBackupEvidenceArtifact(data);
  return { present: validation.ok, errors: validation.errors };
}

function checkM2Commands(ctx, results) {
  const tests = [
    "packages/core/src/storage/mobileStorage.test.ts",
    "packages/core/src/storage/profilePersist.test.ts",
    "packages/core/src/storage/coTransact.test.ts",
    "apps/mobile/screens/MigrationGate.test.tsx",
    "apps/mobile/tests/ringBufferWhitelist.test.ts",
    "apps/mobile/screens/Settings.test.tsx",
    "apps/mobile/errors/m1RegistryOnSqlite.test.ts",
    "apps/mobile/diagnostics/export.test.ts",
    "apps/mobile/android/backup_rules.test.ts",
    "apps/mobile/android/backup_rules.xml",
    "apps/mobile/e2e/persistence.yaml",
    "apps/mobile/storage/expoSqliteDriver.ts",
    "apps/mobile/storage/expoStorageSession.ts",
    "apps/mobile/storage/iosBackupExclusion.ts",
    "apps/mobile/modules/sqlite-backup-exclusion/ios/SqliteBackupExclusionModule.swift",
  ];
  for (const rel of tests) {
    push(results, requirePath(`m2-test-${rel}`, fileExists(resolveFromRoot(ctx.root, rel)), rel));
  }

  const iosBackupSources = [
    readText(resolveFromRoot(ctx.root, "apps/mobile/storage/iosBackupExclusion.ts")) ?? "",
    readText(
      resolveFromRoot(
        ctx.root,
        "apps/mobile/modules/sqlite-backup-exclusion/ios/SqliteBackupExclusionModule.swift",
      ),
    ) ?? "",
    readText(resolveFromRoot(ctx.root, "apps/mobile/storage/expoStorageSession.ts")) ?? "",
  ].join("\n");
  const iosBackupOk = /NSURLIsExcludedFromBackupKey|isExcludedFromBackup\s*=\s*true/i.test(
    iosBackupSources,
  );
  push(results, {
    id: "m2-ios-backup-config",
    category: "commands",
    verdict: iosBackupOk ? "PASS" : "FAIL",
    message: iosBackupOk
      ? "file-level iOS NSURLIsExcludedFromBackupKey implementation present"
      : "missing file-level iOS excluded-from-backup (Swift module or runtime hook)",
  });

  if (ctx.executeCommands) {
    push(
      results,
      runCommand("pnpm --filter @my-brain/core test -- mobileStorage", {
        id: "m2-storage-fixture",
        cwd: ctx.root,
        reportClaimsPass: ctx.parsedReport?.verdict === "PASS",
        hardStopOnFailureWhenReportPass: true,
      }),
    );
    push(
      results,
      runCommand("pnpm --filter @my-brain/mobile test -- MigrationGate", {
        id: "m2-migration-gate",
        cwd: ctx.root,
        reportClaimsPass: ctx.parsedReport?.verdict === "PASS",
        hardStopOnFailureWhenReportPass: true,
      }),
    );
    push(
      results,
      runCommand("pnpm --filter @my-brain/mobile test -- m1RegistryOnSqlite", {
        id: "m2-m1-registry-sqlite",
        cwd: ctx.root,
        reportClaimsPass: ctx.parsedReport?.verdict === "PASS",
        hardStopOnFailureWhenReportPass: true,
      }),
    );
    push(
      results,
      runCommand("pnpm --filter @my-brain/mobile test -- ringBufferWhitelist", {
        id: "m2-ring-buffer",
        cwd: ctx.root,
        reportClaimsPass: ctx.parsedReport?.verdict === "PASS",
        hardStopOnFailureWhenReportPass: true,
      }),
    );
  }

  const iosBackupConfigured =
    ctx.parsedReport?.raw.includes("ios_backup_exclude") &&
    /iosBackupExclude:\s*fileLevel/i.test(ctx.parsedReport.raw);
  if (iosBackupConfigured) {
    const evidence = loadM2IosDeviceEvidence(ctx.root);
    push(results, {
      id: "m2-ios-backup-device-evidence",
      category: "deviceEvidence",
      verdict: evidence.present ? "PASS" : "NEEDS_DEVICE_EVIDENCE",
      message: evidence.present
        ? `structured artifact valid: ${M2_IOS_BACKUP_EVIDENCE_ARTIFACT}`
        : `iOS backup exclusion artifact missing or invalid: ${evidence.errors.join("; ")}`,
    });
  }
}

function checkM3Commands(ctx, results) {
  const rootPkg = resolveFromRoot(ctx.root, "package.json");
  push(results, requireScript("m3-secret-scan-script", readPackageScripts(rootPkg), "scan:secrets", rootPkg));

  const bundleLog = resolveFromRoot(
    ctx.root,
    "specs/mobile-app/reports/artifacts/M3-bundle-secret-grep.log",
  );
  push(results, requirePath("m3-bundle-grep-log", fileExists(bundleLog), bundleLog));

  const degradedDoc = resolveFromRoot(ctx.root, "docs/evals/m3-voice-degraded.md");
  push(results, requirePath("m3-degraded-voice-doc", fileExists(degradedDoc), degradedDoc));

  const evidenceCount = ctx.parsedReport?.degradedVoiceEvidenceCount ?? 0;
  push(results, {
    id: "m3-degraded-voice-count",
    category: "commands",
    verdict: evidenceCount >= 2 ? "PASS" : "FAIL",
    message: `degradedVoiceEvidence count ${evidenceCount} (need >=2)`,
  });

  if (!/barge-in|插话|真机/i.test(ctx.parsedReport?.raw ?? "")) {
    push(results, {
      id: "m3-barge-in-device",
      category: "deviceEvidence",
      verdict: "NEEDS_DEVICE_EVIDENCE",
      message: "missing barge-in device evidence",
    });
  }
}

function checkM4Commands(ctx, results) {
  const m3 = loadReport(ctx.root, "M3");
  if (!m3.exists || m3.verdict !== "PASS") {
    push(results, {
      id: "m4-m3-pass",
      category: "forbidden",
      verdict: "HARD_STOP",
      message: "M4 FULL PASS requires M3-GATE PASS",
    });
  }

  const ssrfTest = resolveFromRoot(ctx.root, "packages/core/security/ssrf.test.ts");
  const urlGuardTest = resolveFromRoot(ctx.root, "packages/core/security/urlFetchGuard.test.ts");
  push(results, requirePath("m4-ssrf-test", fileExists(ssrfTest), ssrfTest));
  push(results, requirePath("m4-url-guard-test", fileExists(urlGuardTest), urlGuardTest));

  const missingFromSsrf = grepFixtureIds(ssrfTest, M4_FIXTURES);
  const missingFromGuard = grepFixtureIds(urlGuardTest, M4_FIXTURES);
  const missingFixtures = [...new Set([...missingFromSsrf, ...missingFromGuard])];
  push(results, {
    id: "m4-ssrf-fixture-ids",
    category: "commands",
    verdict: missingFixtures.length === 0 ? "PASS" : "FAIL",
    message:
      missingFixtures.length === 0
        ? "SSRF fixture IDs present"
        : `missing fixture IDs: ${missingFixtures.join(", ")}`,
  });

  push(
    results,
    requirePath(
      "m4-queue-fsm",
      fileExists(resolveFromRoot(ctx.root, "packages/core/provisional/provisionalQueueFsm.test.ts")),
      "packages/core/provisional/provisionalQueueFsm.test.ts",
    ),
  );
  push(
    results,
    requirePath(
      "m4-ingest-gate",
      fileExists(resolveFromRoot(ctx.root, "packages/core/provisional/ingestGate.test.ts")),
      "packages/core/provisional/ingestGate.test.ts",
    ),
  );

  if (!/Android intent|iOS Extension|分享.*真机/i.test(ctx.parsedReport?.raw ?? "")) {
    push(results, {
      id: "m4-share-device",
      category: "deviceEvidence",
      verdict: "NEEDS_DEVICE_EVIDENCE",
      message: "missing share extension / intent device evidence",
    });
  }
}

function checkM5Commands(ctx, results) {
  const required = [
    "docs/evals/m5-signature-fixtures.json",
    "apps/mobile/fixtures/m5-modes/manifest.json",
    "apps/mobile/tests/weatherEvidence.test.ts",
    "apps/mobile/tests/replayEvidence.test.ts",
    "apps/mobile/tests/reverseQuestionEvidence.test.ts",
    "apps/mobile/tests/replayColdStart.test.ts",
    "apps/mobile/tests/nodeBudget.test.ts",
  ];
  for (const rel of required) {
    push(results, requirePath(`m5-path-${rel}`, fileExists(resolveFromRoot(ctx.root, rel)), rel));
  }

  const perfMd = resolveFromRoot(ctx.root, "docs/evals/m5-replay-perf.md");
  const perfExists = fileExists(perfMd);
  if (!perfExists && ctx.parsedReport?.claimsDevicePerfPass) {
    push(results, {
      id: "m5-replay-perf-fake-pass",
      category: "forbidden",
      verdict: "HARD_STOP",
      message: "report claims device perf PASS but m5-replay-perf.md missing",
    });
  } else if (!perfExists) {
    push(results, {
      id: "m5-replay-perf-md",
      category: "deviceEvidence",
      verdict: "NEEDS_DEVICE_EVIDENCE",
      message: "missing docs/evals/m5-replay-perf.md",
    });
  } else {
    push(results, requirePath("m5-replay-perf-md", true, perfMd));
  }
}

function checkM6Commands(ctx, results) {
  const workflow = resolveFromRoot(ctx.root, ".github/workflows/mobile-e2e.yml");
  push(results, requirePath("m6-e2e-ci", fileExists(workflow), workflow));

  const smokeDocs = [
    "docs/evals/m6-ios-smoke.md",
    "docs/evals/m6-android-smoke.md",
  ];
  let hasIos = false;
  let hasAndroid = false;
  for (const rel of smokeDocs) {
    const exists = fileExists(resolveFromRoot(ctx.root, rel));
    push(results, requirePath(`m6-smoke-doc-${rel}`, exists, rel));
    if (rel.includes("ios")) {
      hasIos = exists;
    }
    if (rel.includes("android")) {
      hasAndroid = exists;
    }
  }

  const smokeRecords = ctx.parsedReport?.smokeRecords ?? [];
  for (const [index, record] of smokeRecords.entries()) {
    for (const field of SMOKE_FIELDS) {
      const value = record[field];
      push(results, {
        id: `m6-smoke-${index}-${field}`,
        category: "commands",
        verdict: value && value.trim().length > 0 ? "PASS" : "FAIL",
        message: `smoke record ${index} field ${field}`,
      });
    }
  }

  if (!hasIos || !hasAndroid) {
    push(results, {
      id: "m6-dual-device",
      category: "deviceEvidence",
      verdict: "NEEDS_DEVICE_EVIDENCE",
      message: "missing iOS or Android smoke evidence",
    });
  }

  if (/BLOCKED|WAIVED/i.test(ctx.parsedReport?.raw ?? "")) {
    push(results, {
      id: "m6-optional-track",
      category: "commands",
      verdict: "PASS",
      message: "optional release track marked BLOCKED/WAIVED (not gate FAIL)",
    });
  }
}

function checkM7ACommands(ctx, results) {
  const fixtures = [
    "packages/core/backup/device-migration.test.ts",
    "packages/core/backup/encrypted-backup.test.ts",
    "packages/core/backup/correction-history.test.ts",
  ];
  for (const rel of fixtures) {
    push(results, requirePath(`m7a-${rel}`, fileExists(resolveFromRoot(ctx.root, rel)), rel));
  }
}

function checkM7BCommands(ctx, results) {
  const m7a = loadReport(ctx.root, "M7A");
  if (!m7a.exists || m7a.verdict !== "PASS") {
    push(results, {
      id: "m7b-m7a-pass",
      category: "forbidden",
      verdict: "HARD_STOP",
      message: "M7B requires M7A-GATE PASS",
    });
  }

  const fixtures = [
    "packages/core/sync/conflict.test.ts",
    "packages/core/provisional/ingestGate.test.ts",
  ];
  for (const rel of fixtures) {
    push(results, requirePath(`m7b-${rel}`, fileExists(resolveFromRoot(ctx.root, rel)), rel));
  }
}

function checkM7Commands(ctx, results) {
  checkM7Sequence(ctx, results);
}

function checkStageCommands(ctx, results) {
  const rootPkg = resolveFromRoot(ctx.root, "package.json");
  push(results, requireScript("pnpm-check-script", readPackageScripts(rootPkg), "check", rootPkg));
  // M0 runs `m0-pnpm-check` in checkM0Commands; avoid running the full suite twice (~16+ min).
  if (ctx.stage !== "M0") {
    push(
      results,
      runCommand("pnpm check", {
        id: "pnpm-check",
        cwd: ctx.root,
        reportClaimsPass: ctx.parsedReport?.verdict === "PASS",
        hardStopOnFailureWhenReportPass: true,
      }),
    );
  }

  switch (ctx.stage) {
    case "M0":
      checkM0Commands(ctx, results);
      break;
    case "M1":
      checkM1Commands(ctx, results);
      break;
    case "M2":
      checkM2Commands(ctx, results);
      break;
    case "M3":
      checkM3Commands(ctx, results);
      break;
    case "M4":
      checkM4Commands(ctx, results);
      break;
    case "M5":
      checkM5Commands(ctx, results);
      break;
    case "M6":
      checkM6Commands(ctx, results);
      break;
    case "M7A":
      checkM7ACommands(ctx, results);
      break;
    case "M7B":
      checkM7BCommands(ctx, results);
      break;
    case "M7":
      checkM7Commands(ctx, results);
      break;
    default:
      break;
  }
}

export function runStageChecks(ctx) {
  const checks = [];
  checkRequiredInputs(ctx, checks);
  if (worstVerdict(checks) !== "HARD_STOP") {
    checkSequence(ctx, checks);
    checkReportFields(ctx, checks);
    checkStageCommands(ctx, checks);
    reconcileSequenceReportVerdict(checks);
  }

  return { checks, verdict: worstVerdict(checks) };
}

export function buildContext(root, stage) {
  const reportRel = reportPathForStage(stage === "M7" ? "M7" : stage);
  const reportAbs = resolveFromRoot(root, reportRel);
  const parsedReport = parseGateReport(reportRel, readText(reportAbs));
  const prev = stage === "M7" ? "M7B" : previousStage(stage);
  const prevReportPath = prev ? reportPathForStage(prev) : null;
  const prevParsedReport = prevReportPath
    ? parseGateReport(prevReportPath, readText(resolveFromRoot(root, prevReportPath)))
    : null;

  return {
    root,
    stage,
    executeCommands: shouldExecuteCommands(),
    productPlanPath: resolveFromRoot(root, "docs/MOBILE_PRODUCT_PLAN.md"),
    guardrailsPath: resolveFromRoot(root, "specs/mobile-app/EXECUTION_GUARDRAILS.md"),
    gateSpecPath: resolveFromRoot(root, "specs/mobile-app/GATE_VERIFIER_SPEC.md"),
    statePath: resolveFromRoot(root, "specs/mobile-app/EXECUTION_STATE.json"),
    state: readJson(resolveFromRoot(root, "specs/mobile-app/EXECUTION_STATE.json")),
    stageSpecPath: globStageSpec(root, stage === "M7" ? "M7" : stage),
    reportPath: reportRel,
    parsedReport,
    prevReportPath,
    prevParsedReport,
  };
}

export function printHelp() {
  process.stdout.write(`Usage: pnpm mobile:gate <stage> [--help]

Stages:
  M0 M1 M2 M3 M4 M5 M6 M7A M7B M7

Environment:
  MOBILE_GATE_EXECUTE=1   Run expensive commands (pnpm check, lint, tests)

Exit codes:
  0 PASS
  1 FAIL
  2 NEEDS_DEVICE_EVIDENCE
  3 HARD_STOP
`);
}

export function printResult(stage, checks, verdict) {
  const categories = ["sequence", "report", "commands", "forbidden", "deviceEvidence"];
  const categoryVerdict = (category) => {
    const subset = checks.filter((check) => check.category === category);
    return subset.length > 0 ? worstVerdict(subset) : "PASS";
  };

  process.stdout.write(`${stage}-GATE: ${verdict}\n`);
  process.stdout.write("CHECKS\n");
  for (const category of categories) {
    process.stdout.write(`- ${category}: ${categoryVerdict(category)}\n`);
  }

  process.stdout.write("EVIDENCE\n");
  process.stdout.write(`- report: specs/mobile-app/reports/${stage}-GATE-report.md\n`);
  process.stdout.write("- commands:\n");
  for (const check of checks.filter((item) => item.category === "commands").slice(0, 12)) {
    process.stdout.write(`  - ${check.id}: ${check.verdict} (${check.message.split("\n")[0]})\n`);
  }

  const failed = checks.filter(
    (check) => check.verdict === "FAIL" || check.verdict === "HARD_STOP",
  );
  const needsDevice = checks.filter((check) => check.verdict === "NEEDS_DEVICE_EVIDENCE");
  if (failed.length > 0) {
    process.stdout.write("FAILED_CHECK\n");
    for (const check of failed.slice(0, 20)) {
      process.stdout.write(`- ${check.category}.${check.id}\n`);
    }
    process.stdout.write("LOG_TAIL\n");
    for (const check of failed.slice(0, 5)) {
      process.stdout.write(`${check.id}: ${check.message}\n`);
    }
  }

  if (verdict === "HARD_STOP") {
    process.stdout.write("REASON\n");
    process.stdout.write(`- ${failed.find((check) => check.verdict === "HARD_STOP")?.message ?? "hard stop"}\n`);
    process.stdout.write("NEXT_REQUIRED_ACTION\n");
    process.stdout.write("- repair blocker before advancing pipeline\n");
  } else if (verdict === "NEEDS_DEVICE_EVIDENCE") {
    process.stdout.write("REASON\n");
    process.stdout.write(
      `- ${needsDevice[0]?.message ?? "device evidence missing"}\n`,
    );
    process.stdout.write("NEXT_REQUIRED_ACTION\n");
    process.stdout.write("- attach device evidence and re-run verifier\n");
  } else if (verdict === "FAIL") {
    process.stdout.write("NEXT\n");
    process.stdout.write("- repair_current_phase_only\n");
  } else {
    process.stdout.write("NEXT\n");
    if (stage === "M7") {
      process.stdout.write("- allowedNextAction: complete\n");
    } else if (stage === "M6") {
      process.stdout.write("- allowedNextAction: run_M7A_only\n");
    } else if (stage === "M7A") {
      process.stdout.write("- allowedNextAction: run_M7B_only\n");
    } else if (stage === "M7B") {
      process.stdout.write("- allowedNextAction: run_M7_aggregate_then_complete\n");
    } else {
      const next = Number.parseInt(stage.replace("M", ""), 10) + 1;
      process.stdout.write(`- allowedNextAction: run_M${next}_only\n`);
    }
  }
}

