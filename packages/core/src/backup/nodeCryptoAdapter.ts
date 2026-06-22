import { createDecipheriv, createCipheriv, randomBytes, scryptSync } from "node:crypto";

import type { BackupCryptoPort } from "./cryptoPort.js";
import {
  BACKUP_ENVELOPE_ALGORITHM,
  BACKUP_ENVELOPE_VERSION,
  type EncryptedBackupEnvelope,
} from "./encryptedBackupTypes.js";

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, 32);
}

export function createNodeBackupCryptoPort(): BackupCryptoPort {
  return {
    available: true,
    encryptAes256Gcm(plaintext: string, passphrase: string): EncryptedBackupEnvelope {
      const salt = randomBytes(16);
      const iv = randomBytes(12);
      const key = deriveKey(passphrase, salt);
      const cipher = createCipheriv(BACKUP_ENVELOPE_ALGORITHM, key, iv);
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
      const authTag = cipher.getAuthTag();

      return {
        envelope_version: BACKUP_ENVELOPE_VERSION,
        algorithm: BACKUP_ENVELOPE_ALGORITHM,
        salt: salt.toString("base64"),
        iv: iv.toString("base64"),
        auth_tag: authTag.toString("base64"),
        ciphertext: encrypted.toString("base64"),
      };
    },
    decryptAes256Gcm(envelope: EncryptedBackupEnvelope, passphrase: string): string {
      const salt = Buffer.from(envelope.salt, "base64");
      const iv = Buffer.from(envelope.iv, "base64");
      const authTag = Buffer.from(envelope.auth_tag, "base64");
      const ciphertext = Buffer.from(envelope.ciphertext, "base64");
      const key = deriveKey(passphrase, salt);
      const decipher = createDecipheriv(BACKUP_ENVELOPE_ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString("utf8");
    },
  };
}
