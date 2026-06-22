import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { listSharePayloadFixtureIds, M4_SHARE_PAYLOAD_FIXTURES } from "@my-brain/core";

import type { ShareFixtureIntakeDiagnostic } from "../capture/shareFixtureIntake";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import { colors } from "../theme/tokens";

function fixtureLabel(id: string): string {
  const fixture = M4_SHARE_PAYLOAD_FIXTURES.find((f) => f.id === id);
  if (!fixture) {
    return id;
  }
  const platform = fixture.platform ?? "—";
  const kind = fixture.payloadKind ?? fixture.expectIntake ?? "special";
  return `${id} (${platform}/${kind})`;
}

export function M4SharePayloadDiagnosticsPanel() {
  const graph = useMobileAppStore((s) => s.graph);
  const setQueueSheetOpen = useMobileAppStore((s) => s.setQueueSheetOpen);
  const injectShareFixture = useProvisionalStore((s) => s.injectShareFixture);
  const injectSharePayloadRaw = useProvisionalStore((s) => s.injectSharePayloadRaw);
  const lastShareIntakeDiagnostic = useProvisionalStore((s) => s.lastShareIntakeDiagnostic);

  const [customJson, setCustomJson] = useState("");
  const [busy, setBusy] = useState(false);

  const runFixture = useCallback(
    async (fixtureId: string) => {
      setBusy(true);
      try {
        const diagnostic = await injectShareFixture(fixtureId);
        if (diagnostic.ok) {
          setQueueSheetOpen(true);
        }
      } finally {
        setBusy(false);
      }
    },
    [injectShareFixture, setQueueSheetOpen],
  );

  const runCustomJson = useCallback(async () => {
    const trimmed = customJson.trim();
    if (!trimmed || busy) {
      return;
    }
    setBusy(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed) as unknown;
      } catch {
        const fail: ShareFixtureIntakeDiagnostic = {
          fixtureId: "custom-json",
          ok: false,
          code: "SHARE_PAYLOAD_INVALID",
          hint: "JSON 解析失败",
          graphNodeCount: graph.countVisibleNodes(),
        };
        useProvisionalStore.getState().setShareIntakeDiagnostic(fail);
        return;
      }
      const diagnostic = await injectSharePayloadRaw(parsed, "custom-json");
      if (diagnostic.ok) {
        setQueueSheetOpen(true);
      }
    } finally {
      setBusy(false);
    }
  }, [customJson, busy, graph, injectSharePayloadRaw, setQueueSheetOpen]);

  const fixtureIds = listSharePayloadFixtureIds();

  return (
    <View style={styles.panel} testID="m4-share-payload-diagnostics-panel">
      <Text style={styles.sectionTitle}>M4 分享 payload 诊断（Dev Client）</Text>
      <Text style={styles.banner} testID="m4-share-mock-banner">
        mock/prep only · 注入 App Group / intent JSON fixture → provisional 队列 · 非 Android
        intent / iOS Share Extension PASS
      </Text>
      {lastShareIntakeDiagnostic ? (
        <View style={styles.resultBox} testID="m4-share-last-result">
          <Text style={styles.resultLine} testID="m4-share-last-fixture-id">
            fixture: {lastShareIntakeDiagnostic.fixtureId}
          </Text>
          <Text style={styles.resultLine} testID="m4-share-last-ok">
            ok: {lastShareIntakeDiagnostic.ok ? "true" : "false"}
          </Text>
          {lastShareIntakeDiagnostic.code ? (
            <Text style={styles.resultLine} testID="m4-share-last-code">
              code: {lastShareIntakeDiagnostic.code}
            </Text>
          ) : null}
          {lastShareIntakeDiagnostic.hint ? (
            <Text style={styles.resultHint} testID="m4-share-last-hint">
              {lastShareIntakeDiagnostic.hint}
            </Text>
          ) : null}
          {lastShareIntakeDiagnostic.sourceType ? (
            <Text style={styles.resultLine} testID="m4-share-last-source">
              sourceType: {lastShareIntakeDiagnostic.sourceType}
            </Text>
          ) : null}
          <Text style={styles.resultLine} testID="m4-share-graph-nodes">
            permanent nodes: {lastShareIntakeDiagnostic.graphNodeCount}
          </Text>
        </View>
      ) : null}
      <ScrollView style={styles.fixtureList} testID="m4-share-fixture-list">
        {fixtureIds.map((id) => (
          <Pressable
            key={id}
            style={styles.fixtureBtn}
            disabled={busy}
            onPress={() => void runFixture(id)}
            testID={`m4-share-fixture-${id}`}
          >
            <Text style={styles.fixtureBtnText}>{fixtureLabel(id)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <TextInput
        style={styles.jsonInput}
        placeholder='自定义 JSON payload，例 {"platform":"ios","payloadKind":"text","title":"…"}'
        placeholderTextColor={colors.textMuted}
        value={customJson}
        onChangeText={setCustomJson}
        multiline
        testID="m4-share-custom-json-input"
      />
      <Pressable
        style={styles.primaryBtn}
        disabled={busy || !customJson.trim()}
        onPress={() => void runCustomJson()}
        testID="m4-share-custom-json-submit"
      >
        <Text style={styles.primaryBtnText}>
          {busy ? "处理中…" : "注入自定义 JSON → provisional"}
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
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  banner: {
    color: colors.accent,
    fontSize: 11,
    marginBottom: 10,
  },
  resultBox: {
    backgroundColor: "#12151c",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  resultLine: {
    color: colors.textMuted,
    fontSize: 11,
    fontFamily: "monospace",
  },
  resultHint: {
    color: "#f5a623",
    fontSize: 12,
    marginVertical: 4,
  },
  fixtureList: {
    maxHeight: 200,
    marginBottom: 10,
  },
  fixtureBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#1a1f2a",
    borderRadius: 8,
    marginBottom: 6,
  },
  fixtureBtnText: {
    color: colors.primary,
    fontSize: 12,
  },
  jsonInput: {
    backgroundColor: "#12151c",
    borderRadius: 8,
    padding: 10,
    color: colors.text,
    fontSize: 12,
    minHeight: 72,
    marginBottom: 8,
    fontFamily: "monospace",
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
});
