import { isTauriRuntime } from "@/lib/platform";
import { TauriSqlStorageProvider } from "./adapters/tauriSqlStorage";
import { WebSqlStorageProvider } from "./adapters/webSqlStorage";
import type { StorageProvider } from "./types";

export function createStorageProvider(): StorageProvider {
  return isTauriRuntime()
    ? new TauriSqlStorageProvider()
    : new WebSqlStorageProvider();
}
