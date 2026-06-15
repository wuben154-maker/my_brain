import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useMobileAppStore } from "../stores/mobileAppStore";
import { useProvisionalStore } from "../stores/provisionalStore";
import { colors } from "../theme/tokens";

interface Props {
  testID?: string;
}

export function QuickCaptureFab({ testID = "quick-capture-fab" }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [capturing, setCapturing] = useState(false);
  const addTextCapture = useProvisionalStore((s) => s.addTextCapture);
  const addLinkCapture = useProvisionalStore((s) => s.addLinkCapture);
  const addLinkFixture = useProvisionalStore((s) => s.addLinkFixture);
  const setQueueSheetOpen = useMobileAppStore((s) => s.setQueueSheetOpen);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    addTextCapture(trimmed);
    setText("");
    setOpen(false);
    setQueueSheetOpen(true);
  };

  const submitLink = async () => {
    const url = linkUrl.trim();
    if (!url || capturing) {
      return;
    }
    setCapturing(true);
    try {
      await addLinkCapture(url.slice(0, 48), url);
      setLinkUrl("");
      setOpen(false);
      setQueueSheetOpen(true);
    } finally {
      setCapturing(false);
    }
  };

  const addMockLink = () => {
    addLinkFixture("mock 链接 fixture", "https://example.com/fixture");
    setOpen(false);
    setQueueSheetOpen(true);
  };

  return (
    <>
      <Pressable style={styles.fab} onPress={() => setOpen(true)} testID={testID}>
        <Text style={styles.fabText}>＋ 记下</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>快速捕获</Text>
            <TextInput
              style={styles.input}
              placeholder="文字或想法…"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              testID="quick-capture-input"
            />
            <Pressable style={styles.primaryBtn} onPress={submit} testID="quick-capture-submit">
              <Text style={styles.primaryBtnText}>加入待点亮星尘</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="https 链接（经 SSRF 校验）"
              placeholderTextColor={colors.textMuted}
              value={linkUrl}
              onChangeText={setLinkUrl}
              autoCapitalize="none"
              testID="quick-capture-link-input"
            />
            <Pressable
              style={styles.primaryBtn}
              onPress={() => void submitLink()}
              disabled={capturing}
              testID="quick-capture-link-submit"
            >
              <Text style={styles.primaryBtnText}>
                {capturing ? "校验中…" : "添加链接（mock guard）"}
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={addMockLink}>
              <Text style={styles.secondaryBtnText}>添加 mock 链接 fixture</Text>
            </Pressable>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.cancel}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    bottom: 100,
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    elevation: 4,
  },
  fabText: {
    color: "#fff",
    fontWeight: "600",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#12151c",
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryBtn: {
    padding: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: colors.primary,
  },
  cancel: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
  },
});
