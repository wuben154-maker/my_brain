import { spawnSync } from "node:child_process";

/** Full `pnpm check` on Windows can exceed 8 min; gate must fail loudly, not hang forever. */
const DEFAULT_COMMAND_TIMEOUT_MS = 180_000;
const PNPM_CHECK_TIMEOUT_MS = 900_000;

function resolveTimeoutMs(command, explicit) {
  if (explicit !== undefined) {
    return explicit;
  }
  if (/\bpnpm\s+check\b/.test(command)) {
    return PNPM_CHECK_TIMEOUT_MS;
  }
  return DEFAULT_COMMAND_TIMEOUT_MS;
}

export function shouldExecuteCommands() {
  return process.env.MOBILE_GATE_EXECUTE === "1";
}

export function runCommand(command, options) {
  const execute = shouldExecuteCommands();
  if (!execute) {
    return {
      id: options.id,
      category: "commands",
      verdict: "PASS",
      message: `skipped execution (set MOBILE_GATE_EXECUTE=1 to run): ${command}`,
    };
  }

  const timeoutMs = resolveTimeoutMs(command, options.timeoutMs);
  process.stderr.write(
    `[mobile-gate] ${options.id}: running \`${command}\` (timeout ${timeoutMs}ms)\n`,
  );

  const result = spawnSync(command, {
    cwd: options.cwd,
    shell: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
    env: {
      ...process.env,
      CI: "1",
    },
  });

  if (result.error?.code === "ETIMEDOUT") {
    const message = `${command} timed out after ${timeoutMs}ms`;
    if (options.reportClaimsPass && options.hardStopOnFailureWhenReportPass) {
      return {
        id: options.id,
        category: "commands",
        verdict: "HARD_STOP",
        message: `report claims PASS but command timed out (${message})`,
      };
    }
    return {
      id: options.id,
      category: "commands",
      verdict: "FAIL",
      message,
    };
  }

  const exitCode = result.status ?? 1;
  const tail = `${result.stdout ?? ""}${result.stderr ?? ""}`
    .trim()
    .split("\n")
    .slice(-8)
    .join("\n");

  if (exitCode === 0) {
    return {
      id: options.id,
      category: "commands",
      verdict: "PASS",
      message: `${command} exit 0`,
    };
  }

  if (options.reportClaimsPass && options.hardStopOnFailureWhenReportPass) {
    return {
      id: options.id,
      category: "commands",
      verdict: "HARD_STOP",
      message: `report claims PASS but command failed (${command}, exit ${exitCode})\n${tail}`,
    };
  }

  return {
    id: options.id,
    category: "commands",
    verdict: "FAIL",
    message: `${command} exit ${exitCode}\n${tail}`,
  };
}

export function requirePath(id, exists, path, hardStop = false) {
  return {
    id,
    category: "commands",
    verdict: exists ? "PASS" : hardStop ? "HARD_STOP" : "FAIL",
    message: exists ? `found ${path}` : `missing ${path}`,
  };
}

export function requireScript(id, scripts, scriptName, packagePath) {
  if (!scripts) {
    return {
      id,
      category: "commands",
      verdict: "FAIL",
      message: `missing package scripts in ${packagePath}`,
    };
  }
  if (!(scriptName in scripts)) {
    return {
      id,
      category: "commands",
      verdict: "FAIL",
      message: `script "${scriptName}" missing in ${packagePath}`,
    };
  }
  return {
    id,
    category: "commands",
    verdict: "PASS",
    message: `script "${scriptName}" present in ${packagePath}`,
  };
}
