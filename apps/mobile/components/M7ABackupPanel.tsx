import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  pickBackupJsonFile,
  readBackupFilePickerAvailability,
} from "../backup/backupFilePicker";
import {
  exportLocalBackup,
  importLocalBackup,
  importLocalBackupAndRehydrate,
} from "../backup/backupHandoff";
import { getStorageSession } from "../storage/storageSession";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { colors } from "../theme/tokens";

type BackupPanelStatus =
  | { state: "idle" }
  | { state: "ready"; message: string }
  | { state: "error"; message: string; hintCode?: string };

interface Props {
  /** Product copy on Settings main path; dev keeps M7A engineering labels. */
  variant?: "product" | "dev";
}

export function M7ABackupPanel({ variant = "product" }: Props) {
  const [status, setStatus] = useState<BackupPanelStatus>({ state: "idle" });
  const [importJson, setImportJson] = useState("");
  const filePickerAvailability = useMemo(() => readBackupFilePickerAvailability(), []);

  const requireSession = useCallback(() => {
    const session = getStorageSession();
    if (!session) {
      setStatus({
        state: "error",
        message: "存储未就绪 — 请等待 MigrationGate 完成后再备份/恢复。",
        hintCode: "storage:not_ready",
      });
      return null;
    }
    return session;
  }, []);

  const onExportBackup = useCallback(async () => {
    const session = requireSession();
    if (!session) {
      return;
    }
    const result = exportLocalBackup(session);
    if (!result.ok) {
      setStatus({
        state: "error",
        message: result.reason,
        hintCode: result.hintCode,
      });
      return;
    }
    const { Share } = await import("react-native");
    await Share.share({
      message: result.json,
      title: "mybrain-backup.json",
    });
    setStatus({
      state: "ready",
      message: `已导出 ${result.entityCount} 个 manifest 实体（明文 JSON，可通过 Share 分享）。`,
    });
  }, [requireSession]);

  const applyImportResult = useCallback(
    (result: ReturnType<typeof importLocalBackup>, sourceLabel: string) => {
      if (!result.ok) {
        setStatus({
          state: "error",
          message: result.reason,
          hintCode: result.hintCode,
        });
        return;
      }
      setStatus({
        state: "ready",
        message: `已从${sourceLabel}恢复 ${result.restoredEntities} 个 manifest 实体，界面已同步。`,
      });
    },
    [],
  );

  const runImport = useCallback(
    (json: string, sourceLabel: string) => {
      const session = requireSession();
      if (!session) {
        return;
      }
      applyImportResult(
        importLocalBackupAndRehydrate(
          session,
          json,
          useMobileAppStore.getState().hasApiKey,
        ),
        sourceLabel,
      );
    },
    [applyImportResult, requireSession],
  );

  const onImportBackup = useCallback(() => {
    const json = importJson.trim();
    if (!json) {
      setStatus({
        state: "error",
        message: "请粘贴完整 backup JSON 后再导入。",
        hintCode: "import:missing_payload",
      });
      return;
    }
    runImport(json, "粘贴 JSON");
  }, [importJson, runImport]);

  const onImportFromFile = useCallback(async () => {
    const session = requireSession();
    if (!session) {
      return;
    }
    if (!filePickerAvailability.available) {
      setStatus({
        state: "error",
        message: filePickerAvailability.message,
        hintCode: "import:file_picker_unavailable",
      });
      return;
    }
    const picked = await pickBackupJsonFile();
    if (!picked.ok) {
      setStatus({
        state: "error",
        message: picked.reason,
        hintCode: picked.hintCode,
      });
      return;
    }
    setImportJson(picked.json);
    runImport(picked.json, "文件");
  }, [filePickerAvailability, requireSession, runImport]);

  const statusMessage =
    status.state === "idle"
      ? variant === "dev"
        ? [
            "明文 JSON 导出/粘贴导入可用。",
            filePickerAvailability.available
              ? filePickerAvailability.message
              : `${filePickerAvailability.message}`,
            "加密备份不在当前 LIVE-09 范围内。",
          ].join(" ")
        : [
            "导出本地 brain 为 JSON，或从备份恢复。",
            filePickerAvailability.available
              ? filePickerAvailability.message
              : filePickerAvailability.message,
          ].join(" ")
      : status.message;

  const sectionTitle =
    variant === "dev" ? "M7A 本地备份 / 恢复" : "本地备份 / 恢复";
  const panelTestId = variant === "dev" ? "m7a-backup-panel" : "settings-backup-controls";
  const hintTestId = variant === "dev" ? "m7a-backup-mock-banner" : "settings-backup-hint";

  return (
    <View style={styles.panel} testID={panelTestId}>
      <Text style={styles.section}>{sectionTitle}</Text>
      <Text style={styles.mockBanner} testID={hintTestId}>
        不含 raw audio / 全文 article；画像敏感明文默认不导出。
      </Text>
      <Text style={styles.hint} testID="m7a-backup-status">
        {statusMessage}
        {status.state === "error" && status.hintCode ? ` (${status.hintCode})` : ""}
      </Text>
      <TextInput
        style={styles.input}
        value={importJson}
        onChangeText={setImportJson}
        placeholder="粘贴 backup JSON"
        multiline
        testID="m7a-backup-import-json"
      />
      <Pressable
        onPress={() => {
          void onExportBackup();
        }}
        style={styles.button}
        testID="m7a-export-backup"
      >
        <Text style={styles.buttonText}>导出明文 JSON 备份</Text>
      </Pressable>
      <Pressable onPress={onImportBackup} style={styles.button} testID="m7a-import-backup">
        <Text style={styles.buttonText}>从 JSON 恢复</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void onImportFromFile();
        }}
        style={[
          styles.button,
          !filePickerAvailability.available ? styles.buttonDisabled : null,
        ]}
        testID="m7a-import-backup-file"
      >
        <Text style={styles.buttonText}>
          {filePickerAvailability.available ? "从文件导入 JSON" : "文件导入（不可用）"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  section: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  mockBanner: {
    color: colors.accent,
    fontSize: 12,
    marginBottom: 8,
  },
  hint: {
    color: colors.text,
    fontSize: 13,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.textMuted,
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    minHeight: 48,
    color: colors.text,
    fontSize: 12,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
});
