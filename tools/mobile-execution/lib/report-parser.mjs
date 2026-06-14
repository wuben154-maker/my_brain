function hasField(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function parseKnowledgeOsStatus(text) {
  const block = text.match(
    /KNOWLEDGE_OS_VISION\.md[\s\S]{0,400}?(merged|waiver|PR-open)/i,
  );
  if (block) {
    const status = block[1]?.toLowerCase();
    if (status === "merged") {
      return "merged";
    }
    if (status === "waiver") {
      return "waiver";
    }
  }
  if (/KNOWLEDGE_OS_VISION\.md/.test(text) && /waiver/i.test(text)) {
    return "waiver";
  }
  if (/KNOWLEDGE_OS_VISION\.md/.test(text) && /merged/i.test(text)) {
    return "merged";
  }
  if (/KNOWLEDGE_OS_VISION\.md/.test(text)) {
    return "unknown";
  }
  return "missing";
}

function parseVerdict(text) {
  const patterns = [
    /[*-]\s*\*\*判定\*\*[：:]\s*(PASS|FAIL|DEGRADED|NEEDS_DEVICE_EVIDENCE|BLOCKED|WAIVED)/i,
    /判定[：:]\s*(PASS|FAIL|DEGRADED|NEEDS_DEVICE_EVIDENCE|BLOCKED|WAIVED)/i,
    /\*\*verdict\*\*[：:]\s*(PASS|FAIL|DEGRADED|NEEDS_DEVICE_EVIDENCE|BLOCKED|WAIVED)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }
  return null;
}

function parseSmokeRecords(text) {
  const records = [];
  const jsonBlocks = text.matchAll(/```json\s*([\s\S]*?)```/g);
  for (const block of jsonBlocks) {
    const body = block[1]?.trim();
    if (!body) {
      continue;
    }
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") {
            records.push(item);
          }
        }
      } else if (parsed && typeof parsed === "object") {
        records.push(parsed);
      }
    } catch {
      // ignore malformed JSON blocks
    }
  }

  const lines = text.split("\n");
  let header = [];
  for (const line of lines) {
    if (!line.trim().startsWith("|")) {
      continue;
    }
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length === 0) {
      continue;
    }
    if (cells.some((cell) => /device/i.test(cell))) {
      header = cells.map((cell) => cell.toLowerCase());
      continue;
    }
    if (header.length > 0 && !cells.every((cell) => /^-+$/.test(cell))) {
      const record = {};
      for (let i = 0; i < header.length; i += 1) {
        record[header[i] ?? `col${i}`] = cells[i] ?? "";
      }
      records.push(record);
    }
  }

  return records;
}

function parseM2Keys(text) {
  const keys = [
    "migration_gate",
    "kill_process_recovery",
    "diagnostic_whitelist",
    "provider_status_panel",
    "ingest_proposal_persist",
    "android_backup_exclude",
    "ios_backup_exclude",
    "degraded_mode_layering",
  ];
  return keys.filter((key) => new RegExp(key, "i").test(text));
}

function parseReportLinks(text) {
  const links = new Set();
  const markdownLinks = text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);
  for (const link of markdownLinks) {
    const href = link[1];
    if (href && href.includes("GATE-report.md")) {
      links.add(href);
    }
  }
  const plainPaths = text.matchAll(
    /specs\/mobile-app\/reports\/M(?:[0-6]|7(?:A|B)?)-GATE-report\.md/g,
  );
  for (const path of plainPaths) {
    links.add(path[0]);
  }
  return [...links];
}

function parseExpoEvidence(text) {
  if (/\[x\].*expo start.*实测/i.test(text)) {
    return true;
  }
  if (/expo start.*smoke.*PASS/i.test(text)) {
    return true;
  }
  if (/expo config.*\|\s*0\s*\|/i.test(text)) {
    return true;
  }
  if (/expo start.*\|\s*0\s*\|/i.test(text)) {
    return true;
  }
  if (/Metro.*ready|Waiting on/i.test(text) && /expo start/i.test(text)) {
    return true;
  }
  if (/\[ \].*expo start.*实测/i.test(text)) {
    return false;
  }
  if (/expo start.*未执行|expo start.*未实测|未安装 Expo/i.test(text)) {
    return false;
  }
  return false;
}

export function parseGateReport(path, raw) {
  if (!raw) {
    return {
      path,
      exists: false,
      raw: "",
      verdict: null,
      fields: {
        stage: false,
        verdict: false,
        date: false,
        executor: false,
        supervisor: false,
        enter: false,
        exit: false,
        commands: false,
        tests: false,
        commit: false,
        risks: false,
        nextPhase: false,
        signoff: false,
      },
      knowledgeOsStatus: "missing",
      claimsDevicePerfPass: false,
      degradedVoiceEvidenceCount: 0,
      m2EvidenceKeys: [],
      smokeRecords: [],
      reportLinks: [],
      expoEvidenceOk: false,
    };
  }

  const degradedMatches = raw.match(/degradedVoiceEvidence/gi) ?? [];
  const scenarioMatches = raw.match(/degradedVoiceEvidence[\s\S]{0,200}scenario/gi) ?? [];

  return {
    path,
    exists: true,
    raw,
    verdict: parseVerdict(raw),
    fields: {
      stage: hasField(raw, [/阶段/]),
      verdict: hasField(raw, [/判定/]),
      date: hasField(raw, [/日期/]),
      executor: hasField(raw, [/执行者/]),
      supervisor: hasField(raw, [/监督者/]),
      enter: hasField(raw, [/Enter/i, /进入条件/]),
      exit: hasField(raw, [/Exit/i, /验收/]),
      commands: hasField(raw, [/命令证据/, /命令/]),
      tests: hasField(raw, [/测试/, /E2E/, /真机/]),
      commit: hasField(raw, [/Commit/i, /Diff/i]),
      risks: hasField(raw, [/风险/, /waiver/i]),
      nextPhase: hasField(raw, [/下一阶段/, /许可/]),
      signoff: hasField(raw, [/签核/]),
    },
    knowledgeOsStatus: parseKnowledgeOsStatus(raw),
    claimsDevicePerfPass: /真机.*perf.*PASS/i.test(raw) || /m5-replay-perf.*PASS/i.test(raw),
    degradedVoiceEvidenceCount: Math.max(degradedMatches.length, scenarioMatches.length),
    m2EvidenceKeys: parseM2Keys(raw),
    smokeRecords: parseSmokeRecords(raw),
    reportLinks: parseReportLinks(raw),
    expoEvidenceOk: parseExpoEvidence(raw),
  };
}
