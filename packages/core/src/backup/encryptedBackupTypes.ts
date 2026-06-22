export const BACKUP_ENVELOPE_VERSION = 1;
export const BACKUP_ENVELOPE_ALGORITHM = "aes-256-gcm" as const;

export interface EncryptedBackupEnvelope {
  envelope_version: number;
  algorithm: typeof BACKUP_ENVELOPE_ALGORITHM;
  salt: string;
  iv: string;
  auth_tag: string;
  ciphertext: string;
}
