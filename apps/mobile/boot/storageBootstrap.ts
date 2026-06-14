import { useCallback, useEffect, useState } from "react";



import { SchemaMigrationError, StorageInitError } from "@my-brain/core";



import {

  hydrateFromStorage,

  runMigration,

  setStorageSession,

  type BootStatus,

} from "../storage/storageSession";



export interface StorageBootstrapResult {

  status: BootStatus;

  error: string | null;

  schemaVersion: number;

  retry: () => void;

}



/** True in Vitest/Node unit tests — never in RN Dev Client bundle execution. */

export function isVitestRuntime(): boolean {

  return typeof process !== "undefined" && process.env.VITEST === "true";

}



function openStorageSession() {

  if (isVitestRuntime()) {

    // Dynamic require keeps the test adapter out of the default RN bundle graph.

    // eslint-disable-next-line @typescript-eslint/no-require-imports

    const { createTestStorageSession } = require("../storage/testStorageSession") as typeof import("../storage/testStorageSession");

    const configured = process.env.MOBILE_TEST_DB;

    const dbPath =

      configured && configured !== ":memory-test:"

        ? configured

        : `:memory:${Date.now()}`;

    return createTestStorageSession(dbPath);

  }



  // eslint-disable-next-line @typescript-eslint/no-require-imports

  const { createExpoStorageSession } = require("../storage/expoStorageSession") as typeof import("../storage/expoStorageSession");

  return createExpoStorageSession();

}



/** M2: opens SQLite, runs migrations, hydrates stores. Vitest uses Node test adapter fallback. */

export function useStorageBootstrap(

  onHydrated: (bundle: ReturnType<typeof hydrateFromStorage>) => void,

): StorageBootstrapResult {

  const [status, setStatus] = useState<BootStatus>("boot");

  const [error, setError] = useState<string | null>(null);

  const [schemaVersion, setSchemaVersion] = useState(0);



  const bootstrap = useCallback(() => {

    setStatus("migrating");

    setError(null);

    try {

      const session = openStorageSession();

      runMigration(session.storage);

      setStorageSession(session);

      const bundle = hydrateFromStorage(session.storage);

      setSchemaVersion(session.storage.getSchemaVersion());

      onHydrated(bundle);

      setStatus("ready");

    } catch (e) {

      if (e instanceof SchemaMigrationError) {

        setError(e.message);

        setSchemaVersion(e.schemaVersion);

        setStatus("migration_error");

        return;

      }

      if (e instanceof StorageInitError) {

        setError(e.message);

        setStatus("migration_error");

        return;

      }

      setError(e instanceof Error ? e.message : "storage init failed");

      setStatus("migration_error");

    }

  }, [onHydrated]);



  useEffect(() => {

    bootstrap();

  }, [bootstrap]);



  return { status, error, schemaVersion, retry: bootstrap };

}

