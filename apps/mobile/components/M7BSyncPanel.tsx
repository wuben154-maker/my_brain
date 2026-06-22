import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  mergeRemoteSyncPayloadIntoSession,
} from "../sync/syncHandoff";
import { getStorageSession } from "../storage/storageSession";
import { colors } from "../theme/tokens";

type SyncPanelStatus =
  | { state: "idle" }
  | { state: "ready"; message: string }
  | { state: "conflict"; message: string; hintCode?: string }
  | { state: "error"; message: string; hintCode?: string };

export function M7BSyncPanel() {
  const [status, setStatus] = useState<SyncPanelStatus>({ state: "idle" });
  const [remoteJson, setRemoteJson] = useState("");
  const [showConflictPanel, setShowConflictPanel] = useState(false);

  const statusMessage = useMemo(() => {
    if (status.state === "idle") {
      return "dev/mock SyncProvider handoff — 双端真机同步 PENDING_DEVICE。";
    }
    return status.message;
  }, [status]);

  const requireSession = useCallback(() => {
    const session = getStorageSession();
    if (!session) {
      setStatus({
        state: "error",
        message: "存储未就绪 — 请等待 MigrationGate 完成后再同步合并。",
        hintCode: "storage:not_ready",
      });
      return null;
    }
    return session;
  }, []);

  const runMerge = useCallback(
    (keepLocalCorrection = false) => {
      const session = requireSession();
      if (!session) {
        return;
      }
      const payload = remoteJson.trim();
      if (!payload) {
        setStatus({
          state: "error",
          message: "请粘贴远端 SyncPayload JSON（Maestro/dev 可预填）。",
          hintCode: "sync:missing_payload",
        });
        setShowConflictPanel(false);
        return;
      }

      const result = mergeRemoteSyncPayloadIntoSession(
        session,
        payload,
        "device-local",
        keepLocalCorrection ? { profileConflict: { strategy: "keep_local" } } : {},
      );

      if (!result.ok) {
        const isConflict =
          result.errorClass === "SyncConflictError" ||
          result.hintCode === "trust:manual_overrides_llm";
        if (isConflict) {
          setShowConflictPanel(true);
          setStatus({
            state: "conflict",
            message:
              "检测到 profile/sync 冲突 — 不得 silent 覆盖手动纠偏。请选择保留本地纠偏后重试。",
            hintCode: result.hintCode,
          });
          return;
        }
        setShowConflictPanel(false);
        setStatus({
          state: "error",
          message: result.reason,
          hintCode: result.hintCode,
        });
        return;
      }

      setShowConflictPanel(false);
      setStatus({
        state: "ready",
        message: `同步合并完成：${result.provisionalRouted} 条 provisional 路由，${result.archivedNodeIds} 个节点 archive（delete=archive）。`,
      });
    },
    [remoteJson, requireSession],
  );

  return (
    <View style={styles.panel} testID="m7b-sync-conflict-panel">
      <Text style={styles.section}>M7B 同步 / 冲突合并</Text>
      <Text style={styles.mockBanner} testID="m7b-sync-mock-banner">
        dev/mock handoff：远端 unconfirmed node 仅进 provisional；手动纠偏不会被 silent 覆盖。双端真机证据
        PENDING_DEVICE。
      </Text>
      <Text style={styles.hint} testID="m7b-sync-status">
        {statusMessage}
        {status.state === "error" && status.hintCode ? ` (${status.hintCode})` : ""}
        {status.state === "conflict" && status.hintCode ? ` (${status.hintCode})` : ""}
      </Text>
      <TextInput
        style={styles.input}
        value={remoteJson}
        onChangeText={setRemoteJson}
        placeholder="粘贴远端 SyncPayload JSON（sync-conflict.yaml / profile-review-persist.yaml）"
        multiline
        testID="m7b-sync-remote-json"
      />
      <Pressable onPress={() => runMerge(false)} style={styles.button} testID="m7b-sync-merge">
        <Text style={styles.buttonText}>合并远端 SyncPayload</Text>
      </Pressable>
      {showConflictPanel ? (
        <View style={styles.conflictBox}>
          <Text style={styles.conflictTitle}>冲突策略（§2.2.1 信任优先级）</Text>
          <Pressable
            onPress={() => runMerge(true)}
            style={styles.button}
            testID="m7b-keep-local-correction"
          >
            <Text style={styles.buttonText}>保留本地手动纠偏并重试</Text>
          </Pressable>
        </View>
      ) : null}
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
  buttonText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
  conflictBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.textMuted,
  },
  conflictTitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
});
