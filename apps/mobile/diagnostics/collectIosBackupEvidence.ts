import { Platform, Share } from "react-native";

import {
  buildM2IosBackupDeviceEvidenceArtifact,
  formatM2IosBackupDeviceEvidenceArtifact,
} from "./iosBackupEvidence";
import { collectIosSqliteBackupExclusionReport } from "../storage/iosBackupExclusion";
import { getStorageSession } from "../storage/storageSession";

export type CollectIosBackupEvidenceResult =
  | { ok: true; json: string; message: string }
  | { ok: false; message: string };

/** Touch SQLite so WAL/SHM sidecars exist before reading NSURLIsExcludedFromBackupKey. */
function touchWalSidecars(): void {
  const session = getStorageSession();
  if (!session) {
    return;
  }
  session.driver.exec("PRAGMA user_version;");
}

/**
 * Dev Client only: build M2 gate artifact JSON and open the system share sheet.
 * Does not write into the monorepo on device — user saves/transfers JSON to Windows.
 */
export async function collectAndShareIosBackupEvidence(): Promise<CollectIosBackupEvidenceResult> {
  if (Platform.OS !== "ios") {
    return { ok: false, message: "仅 iOS Dev Client 可采集备份排除证据。" };
  }

  const session = getStorageSession();
  if (!session?.dbPath) {
    return { ok: false, message: "存储尚未就绪，请等待 MigrationGate 完成后再试。" };
  }

  touchWalSidecars();
  const files = collectIosSqliteBackupExclusionReport(session.dbPath);
  if (!files) {
    return {
      ok: false,
      message: "原生模块不可用。请使用含 sqlite-backup-exclusion 的 Dev Client 构建。",
    };
  }

  const artifact = buildM2IosBackupDeviceEvidenceArtifact({
    dbPath: session.dbPath,
    files,
  });
  const json = formatM2IosBackupDeviceEvidenceArtifact(artifact);

  if (artifact.deviceEvidence !== "present") {
    return {
      ok: false,
      message: artifact.notes ?? "设备校验未通过，未生成 present 证据。",
    };
  }

  await Share.share({
    message: json,
    title: "m2-ios-backup-exclusion-device-evidence.json",
  });

  return {
    ok: true,
    json,
    message: "已打开分享面板。请将 JSON 保存到 specs/mobile-app/reports/artifacts/m2-ios-backup-exclusion-device-evidence.json",
  };
}
