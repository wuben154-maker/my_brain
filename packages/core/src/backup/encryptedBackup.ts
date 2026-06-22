import { BackupDecryptError } from "./errors.js";

import {

  assertBackupCryptoAvailable,

  getBackupCryptoPort,

  mapCryptoFailure,

} from "./cryptoPort.js";

import { parseBackupSnapshot, serializeBackupSnapshot } from "./exportBackup.js";

import type { BackupSnapshotPayload } from "./types.js";

import {

  BACKUP_ENVELOPE_ALGORITHM,

  BACKUP_ENVELOPE_VERSION,

  type EncryptedBackupEnvelope,

} from "./encryptedBackupTypes.js";



export type { EncryptedBackupEnvelope } from "./encryptedBackupTypes.js";



export function encryptBackupSnapshot(

  payload: BackupSnapshotPayload,

  passphrase: string,

): EncryptedBackupEnvelope {

  const port = getBackupCryptoPort();

  assertBackupCryptoAvailable(port);

  const plaintext = serializeBackupSnapshot(payload);

  return port.encryptAes256Gcm(plaintext, passphrase);

}



export function decryptBackupSnapshot(

  envelope: EncryptedBackupEnvelope,

  passphrase: string,

): BackupSnapshotPayload {

  if (envelope.envelope_version !== BACKUP_ENVELOPE_VERSION) {

    throw new BackupDecryptError("Unsupported encrypted backup envelope version");

  }

  if (envelope.algorithm !== BACKUP_ENVELOPE_ALGORITHM) {

    throw new BackupDecryptError("Unsupported encrypted backup algorithm");

  }



  const port = getBackupCryptoPort();

  assertBackupCryptoAvailable(port);



  try {

    const decrypted = port.decryptAes256Gcm(envelope, passphrase);

    return parseBackupSnapshot(JSON.parse(decrypted));

  } catch (error) {

    mapCryptoFailure(error);

  }

}



export function serializeEncryptedBackup(envelope: EncryptedBackupEnvelope): string {

  return JSON.stringify(envelope, null, 2);

}



export function parseEncryptedBackup(json: unknown): EncryptedBackupEnvelope {

  if (typeof json !== "object" || json === null) {

    throw new BackupDecryptError("Encrypted backup envelope must be a JSON object");

  }

  return json as EncryptedBackupEnvelope;

}


