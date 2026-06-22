export type ProviderConfigErrorCode = "MISSING_API_KEY";

export class ProviderConfigError extends Error {
  readonly code: ProviderConfigErrorCode;

  constructor(code: ProviderConfigErrorCode, message: string) {
    super(message);
    this.name = "ProviderConfigError";
    this.code = code;
  }
}

export class StorageInitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageInitError";
  }
}

export class SchemaMigrationError extends Error {
  readonly schemaVersion: number;

  constructor(schemaVersion: number, message: string) {
    super(message);
    this.name = "SchemaMigrationError";
    this.schemaVersion = schemaVersion;
  }
}

export class GraphTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphTransactionError";
  }
}

export class TokenExchangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenExchangeError";
  }
}

export class RealtimeVoiceTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RealtimeVoiceTransportError";
  }
}

export class IngestProposalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestProposalError";
  }
}

export class ProvisionalPersistError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProvisionalPersistError";
  }
}

export class UserModeRoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserModeRoutingError";
  }
}

export { SyncConflictError } from "../sync/errors.js";
