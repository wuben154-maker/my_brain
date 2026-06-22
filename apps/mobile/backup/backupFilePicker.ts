/**
 * Optional platform file picker for backup JSON import.
 * RN runtime dynamically loads expo adapter; vitest uses injected/unavailable stub.
 */

export type BackupFilePickResult =
  | { ok: true; json: string; fileName?: string }
  | { ok: false; reason: string; hintCode: string };

export interface BackupFilePickerPort {
  readAvailability(): { available: boolean; message: string };
  pickAndReadJson(): Promise<BackupFilePickResult>;
}

const UNAVAILABLE_MESSAGE =
  "当前平台文件选择器不可用 — 请粘贴完整 backup JSON 恢复。";

const unavailablePort: BackupFilePickerPort = {
  readAvailability() {
    return { available: false, message: UNAVAILABLE_MESSAGE };
  },
  async pickAndReadJson() {
    return {
      ok: false,
      reason: UNAVAILABLE_MESSAGE,
      hintCode: "import:file_picker_unavailable",
    };
  },
};

let injectedPort: BackupFilePickerPort | null = null;
let defaultPort: BackupFilePickerPort | null = null;

function isVitestRuntime(): boolean {
  return typeof process !== "undefined" && process.env.VITEST === "true";
}

export function setBackupFilePickerPort(port: BackupFilePickerPort | null): void {
  injectedPort = port;
  if (port) {
    defaultPort = null;
  }
}

function getDefaultPort(): BackupFilePickerPort {
  if (defaultPort) {
    return defaultPort;
  }
  if (isVitestRuntime()) {
    defaultPort = unavailablePort;
    return defaultPort;
  }
  try {
    // Dynamic require keeps expo modules out of the Vitest graph.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createExpoBackupFilePickerPort } =
      require("./backupFilePicker.expo") as typeof import("./backupFilePicker.expo");
    defaultPort = createExpoBackupFilePickerPort();
    return defaultPort;
  } catch {
    defaultPort = unavailablePort;
    return defaultPort;
  }
}

function getPort(): BackupFilePickerPort {
  return injectedPort ?? getDefaultPort();
}

export function readBackupFilePickerAvailability(): {
  available: boolean;
  message: string;
} {
  return getPort().readAvailability();
}

export async function pickBackupJsonFile(): Promise<BackupFilePickResult> {
  return getPort().pickAndReadJson();
}
