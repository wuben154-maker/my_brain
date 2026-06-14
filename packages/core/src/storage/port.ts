export { STORAGE_SCHEMA_VERSION } from "./schema.js";

/** Minimal storage port — full persistence via MobileStorage + SqlDriver. */
export interface StoragePort {
  init(): Promise<void>;
  close(): Promise<void>;
  getSchemaVersion(): Promise<number>;
}
