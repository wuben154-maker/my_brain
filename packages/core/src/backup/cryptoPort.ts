import { BackupCryptoUnavailableError, BackupDecryptError } from "./errors.js";
import type { EncryptedBackupEnvelope } from "./encryptedBackupTypes.js";

export interface BackupCryptoPort {
  readonly available: boolean;
  readonly unavailableReason?: string;
  encryptAes256Gcm(plaintext: string, passphrase: string): EncryptedBackupEnvelope;
  decryptAes256Gcm(envelope: EncryptedBackupEnvelope, passphrase: string): string;
}

let configuredPort: BackupCryptoPort | undefined;

export function configureBackupCryptoPort(port: BackupCryptoPort): void {
  configuredPort = port;
}

export function resetBackupCryptoPortForTests(): void {
  configuredPort = undefined;
}

export function getBackupCryptoPort(): BackupCryptoPort {
  return configuredPort ?? createUnavailableBackupCryptoPort();
}

export function isBackupCryptoAvailable(): boolean {
  return getBackupCryptoPort().available;
}

export function createUnavailableBackupCryptoPort(
  reason = "Backup crypto adapter is not available on this runtime (PENDING_DEVICE).",
): BackupCryptoPort {
  const fail = (): never => {
    throw new BackupCryptoUnavailableError(reason);
  };
  return {
    available: false,
    unavailableReason: reason,
    encryptAes256Gcm: fail,
    decryptAes256Gcm: fail,
  };
}

export function assertBackupCryptoAvailable(port: BackupCryptoPort = getBackupCryptoPort()): void {
  if (!port.available) {
    throw new BackupCryptoUnavailableError(
      port.unavailableReason ??
        "Backup crypto adapter is not available on this runtime (PENDING_DEVICE).",
    );
  }
}

/** Wrong passphrase still maps to BackupDecryptError at envelope layer. */
export function mapCryptoFailure(error: unknown): never {
  if (error instanceof BackupCryptoUnavailableError || error instanceof BackupDecryptError) {
    throw error;
  }
  throw new BackupDecryptError();
}

export { BackupCryptoUnavailableError };
