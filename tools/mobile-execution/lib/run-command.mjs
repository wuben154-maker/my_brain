import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, delimiter as pathDelimiter } from "node:path";

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

function splitCommandArgs(argsString) {
  if (!argsString.trim()) {
    return [];
  }
  const args = [];
  let current = "";
  let quote = null;
  for (const ch of argsString) {
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) {
    args.push(current);
  }
  return args;
}

function pnpmCjsCandidates() {
  const candidates = [];
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && /pnpm/i.test(npmExecPath)) {
    candidates.push(npmExecPath);
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (appData) {
      candidates.push(join(appData, "npm", "node_modules", "pnpm", "bin", "pnpm.cjs"));
    }
  }
  const home = homedir();
  candidates.push(join(home, ".local", "share", "pnpm", "pnpm"));
  const nodeDir = dirname(process.execPath);
  candidates.push(join(nodeDir, "node_modules", "pnpm", "bin", "pnpm.cjs"));
  candidates.push(join(nodeDir, "..", "lib", "node_modules", "pnpm", "bin", "pnpm.cjs"));
  return candidates;
}

function findPnpmCjs() {
  for (const candidate of pnpmCjsCandidates()) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Resolve `pnpm …` for subprocesses. PowerShell shims are invisible to cmd.exe spawn. */
export function resolveCommandInvocation(command) {
  const trimmed = command.trim();
  const pnpmMatch = /^pnpm(\s+([\s\S]*))?$/.exec(trimmed);
  if (!pnpmMatch) {
    return {
      executable: trimmed,
      args: [],
      display: command,
      useShell: true,
    };
  }

  const pnpmArgs = splitCommandArgs(pnpmMatch[2] ?? "");
  const pnpmCjs = findPnpmCjs();
  if (pnpmCjs) {
    return {
      executable: process.execPath,
      args: [pnpmCjs, ...pnpmArgs],
      display: command,
      useShell: false,
    };
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    const pnpmCmd = appData ? join(appData, "npm", "pnpm.cmd") : "pnpm.cmd";
    if (existsSync(pnpmCmd)) {
      return {
        executable: pnpmCmd,
        args: pnpmArgs,
        display: command,
        useShell: false,
      };
    }
  }

  return {
    executable: "pnpm",
    args: pnpmArgs,
    display: command,
    useShell: false,
  };
}

function enrichPathForPnpm(env) {
  const extraPaths = [];
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (appData) {
      extraPaths.push(join(appData, "npm"));
    }
  }
  const pathKey = process.platform === "win32" ? "Path" : "PATH";
  const existing = env[pathKey] ?? process.env[pathKey] ?? "";
  const merged = [...extraPaths, ...existing.split(pathDelimiter)]
    .filter(Boolean)
    .join(pathDelimiter);
  return {
    ...env,
    [pathKey]: merged,
  };
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
  const invocation = resolveCommandInvocation(command);
  process.stderr.write(
    `[mobile-gate] ${options.id}: running \`${invocation.display}\` (timeout ${timeoutMs}ms)\n`,
  );

  const spawnEnv = enrichPathForPnpm({
    ...process.env,
    CI: "1",
  });

  const result = spawnSync(invocation.executable, invocation.args, {
    cwd: options.cwd,
    shell: invocation.useShell,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
    env: spawnEnv,
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
