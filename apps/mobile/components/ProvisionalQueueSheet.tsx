import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { listPendingCandidates } from "@my-brain/core";

import { useConversationSession } from "../hooks/useConversationSession";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import { colors } from "../theme/tokens";
import { IntentRail } from "./IntentRail";

interface Props {
  testID?: string;
}

export function ProvisionalQueueSheet({ testID = "provisional-queue-sheet" }: Props) {
  const open = useMobileAppStore((s) => s.queueSheetOpen);
  const setOpen = useMobileAppStore((s) => s.setQueueSheetOpen);
  const candidates = useProvisionalStore((s) => s.candidates);
  const pending = listPendingCandidates(candidates);
  const lastExplanation = useProvisionalStore((s) => s.lastExplanation);
  const { focusProvisional, dispatchIntent } = useConversationSession();

  return (
    <Modal visible={open} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID={testID}>
          <Text style={styles.title}>待点亮星尘</Text>
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
                  <Text style={styles.meta}>
                    {c.sourceType} · {c.status}
                  </Text>
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
