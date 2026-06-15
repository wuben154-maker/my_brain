import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { listPendingCandidates, ssrfRejectUserHint } from "@my-brain/core";
import type { SsrfRejectCode } from "@my-brain/core";

import { useConversationSession } from "../hooks/useConversationSession";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import { colors } from "../theme/tokens";
import { IntentRail } from "./IntentRail";

/** M3 not PASS — voice capture path stays disabled in M4 prep. */
const M3_VOICE_DISABLED = true;

interface Props {
  testID?: string;
}

function sourceLabel(sourceType: string): string {
  const labels: Record<string, string> = {
    text: "文字",
    link: "链接",
    learning: "学习",
    project: "项目",
    life: "生活",
    image_mock: "截图 mock",
    voice_note_mock: "语音 mock（禁用）",
  };
  return labels[sourceType] ?? sourceType;
}

export function ProvisionalQueueSheet({ testID = "provisional-queue-sheet" }: Props) {
  const open = useMobileAppStore((s) => s.queueSheetOpen);
  const setOpen = useMobileAppStore((s) => s.setQueueSheetOpen);
  const candidates = useProvisionalStore((s) => s.candidates);
  const pending = listPendingCandidates(candidates);
  const lastExplanation = useProvisionalStore((s) => s.lastExplanation);
  const lastSsrfHint = useProvisionalStore((s) => s.lastSsrfHint);
  const { focusProvisional, dispatchIntent } = useConversationSession();

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID={testID}>
          <Text style={styles.title}>待点亮星尘</Text>
          {M3_VOICE_DISABLED ? (
            <Text style={styles.voiceBanner} testID="voice-disconnected-banner">
              voice_disconnected：M3 未 PASS，语音路径已禁用；请用文字三意图确认。
            </Text>
          ) : null}
          {lastSsrfHint ? (
            <Text style={styles.ssrfBanner} testID="ssrf-hint-banner">
              {lastSsrfHint}
            </Text>
          ) : null}
          <ScrollView style={{ maxHeight: 320 }}>
            {pending.length === 0 ? (
              <Text style={styles.empty}>暂无候选</Text>
            ) : (
              pending.map((c) => (
                <Pressable
                  key={c.id}
                  style={styles.item}
                  onPress={() => focusProvisional(c.id)}
                  testID={`provisional-item-${c.id}`}
                >
                  <Text style={styles.summary}>{c.summary}</Text>
                  <Text style={styles.meta} testID={`provisional-meta-${c.id}`}>
                    {sourceLabel(c.sourceType)} · {c.status}
                    {c.linkUrl ? ` · ${c.linkUrl}` : ""}
                  </Text>
                  {c.ssrfRejectCode ? (
                    <Text style={styles.rejectCode} testID={`provisional-ssrf-${c.id}`}>
                      {c.ssrfRejectCode}:{" "}
                      {ssrfRejectUserHint(c.ssrfRejectCode as SsrfRejectCode)}
                    </Text>
                  ) : c.fetchOk ? (
                    <Text style={styles.fetchOk} testID={`provisional-fetch-ok-${c.id}`}>
                      链接校验通过（mock）
                    </Text>
                  ) : null}
                </Pressable>
              ))
            )}
          </ScrollView>
          {lastExplanation ? (
            <Text style={styles.explain} testID="provisional-explanation">
              {lastExplanation}
            </Text>
          ) : null}
          <IntentRail
            onIntent={(intent) => {
              dispatchIntent(intent);
              if (intent === "ingest" || intent === "skip") {
                setOpen(false);
              }
            }}
          />
          <Pressable onPress={() => setOpen(false)} style={styles.close}>
            <Text style={styles.closeText}>关闭</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    minHeight: 280,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  voiceBanner: {
    color: colors.accent,
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  ssrfBanner: {
    color: "#f5a623",
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  empty: {
    color: colors.textMuted,
    padding: 16,
  },
  item: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  summary: {
    color: colors.text,
    fontSize: 15,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  rejectCode: {
    color: "#f5a623",
    fontSize: 11,
    marginTop: 4,
  },
  fetchOk: {
    color: colors.primary,
    fontSize: 11,
    marginTop: 4,
  },
  explain: {
    color: colors.primary,
    fontSize: 13,
    marginVertical: 8,
    paddingHorizontal: 4,
  },
  close: {
    alignItems: "center",
    padding: 12,
  },
  closeText: {
    color: colors.textMuted,
  },
});
