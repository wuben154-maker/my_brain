/**
 * Expo-backed backup file import — Android SAF directory pick; optional document picker.
 */

import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

import type { BackupFilePickerPort, BackupFilePickResult } from "./backupFilePicker";

function hasDocumentPickerModule(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require.resolve("expo-document-picker");
    return true;
  } catch {
    return false;
  }
}

async function pickWithDocumentPicker(): Promise<BackupFilePickResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DocumentPicker = require("expo-document-picker") as {
    getDocumentAsync: (opts: {
      type: string[];
      copyToCacheDirectory: boolean;
    }) => Promise<{
      canceled: boolean;
      assets?: Array<{ uri: string; name?: string }>;
    }>;
  };
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]?.uri) {
    return {
      ok: false,
      reason: "未选择备份文件。",
      hintCode: "import:file_pick_cancelled",
    };
  }
  const asset = result.assets[0];
  const json = await FileSystem.readAsStringAsync(asset.uri);
  return { ok: true, json, fileName: asset.name };
}

async function pickWithAndroidSaf(): Promise<BackupFilePickResult> {
  const { StorageAccessFramework } = FileSystem;
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    return {
      ok: false,
      reason: "未授予目录访问权限 — 无法读取备份文件。",
      hintCode: "import:directory_denied",
    };
  }

  const entries = await StorageAccessFramework.readDirectoryAsync(permissions.directoryUri);
  const jsonUri = entries.find((uri) => uri.toLowerCase().includes(".json"));
  if (!jsonUri) {
    return {
      ok: false,
      reason: "所选目录中未找到 .json 备份文件。",
      hintCode: "import:no_json_in_directory",
    };
  }

  const json = await FileSystem.readAsStringAsync(jsonUri);
  return { ok: true, json, fileName: jsonUri.split("/").pop() };
}

export function createExpoBackupFilePickerPort(): BackupFilePickerPort {
  const documentPickerAvailable = hasDocumentPickerModule();

  return {
    readAvailability() {
      if (documentPickerAvailable) {
        return { available: true, message: "可从文件选择 backup JSON 导入。" };
      }
      if (Platform.OS === "android") {
        return {
          available: true,
          message: "Android 可通过目录选择包含 .json 备份的文件夹。",
        };
      }
      return {
        available: false,
        message: "当前平台文件选择器不可用 — 请粘贴完整 backup JSON 恢复。",
      };
    },
    async pickAndReadJson() {
      if (documentPickerAvailable) {
        return pickWithDocumentPicker();
      }
      if (Platform.OS === "android") {
        return pickWithAndroidSaf();
      }
      return {
        ok: false,
        reason: "当前平台文件选择器不可用 — 请粘贴完整 backup JSON 恢复。",
        hintCode: "import:file_picker_unavailable",
      };
    },
  };
}
