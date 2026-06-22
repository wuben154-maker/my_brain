import {
  configureBackupCryptoPort,
  createUnavailableBackupCryptoPort,
  isBackupCryptoAvailable,
} from "@my-brain/core";

const RN_ENCRYPTED_BACKUP_PENDING_MESSAGE =
  "设备端加密备份需要 RN crypto 适配器（PENDING_DEVICE）。请先用明文 JSON 导出/导入。";

let registered = false;

/** Wire backup crypto port once per runtime — Node tests override in beforeAll. */
export function registerMobileBackupCryptoPort(): void {
  if (registered) {
    return;
  }
  registered = true;

  if (typeof process !== "undefined" && process.env.VITEST === "true") {
    // Vitest runs on Node; gate-path tests configure node adapter in beforeAll.
    return;
  }

  configureBackupCryptoPort(
    createUnavailableBackupCryptoPort(RN_ENCRYPTED_BACKUP_PENDING_MESSAGE),
  );
}

export function readEncryptedBackupAvailability(): {
  available: boolean;
  message: string;
} {
  registerMobileBackupCryptoPort();
  if (isBackupCryptoAvailable()) {
    return { available: true, message: "加密备份可用（当前 runtime crypto 已注册）。" };
  }
  const port = createUnavailableBackupCryptoPort(RN_ENCRYPTED_BACKUP_PENDING_MESSAGE);
  return {
    available: false,
    message: port.unavailableReason ?? RN_ENCRYPTED_BACKUP_PENDING_MESSAGE,
  };
}

export { RN_ENCRYPTED_BACKUP_PENDING_MESSAGE };
