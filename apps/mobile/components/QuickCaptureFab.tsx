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

import { useTheme } from "../theme/ThemeProvider";

import { brainTheme } from "../theme/tokens";



interface Props {

  testID?: string;

  open?: boolean;

  onOpenChange?: (open: boolean) => void;

  showFab?: boolean;

  onOpenInbox?: () => void;

}



export function QuickCaptureFab({

  testID = "quick-capture-fab",

  open: controlledOpen,

  onOpenChange,

  showFab = true,

  onOpenInbox,

}: Props) {

  const { mode } = useTheme();

  const theme = brainTheme[mode];

  const [internalOpen, setInternalOpen] = useState(false);

  const open = controlledOpen ?? internalOpen;

  const setOpen = (next: boolean) => {

    onOpenChange?.(next);

    if (controlledOpen === undefined) {

      setInternalOpen(next);

    }

  };

  const [text, setText] = useState("");

  const [linkUrl, setLinkUrl] = useState("");

  const [capturing, setCapturing] = useState(false);

  const addTextCapture = useProvisionalStore((s) => s.addTextCapture);

  const addLinkCapture = useProvisionalStore((s) => s.addLinkCapture);

  const setQueueSheetOpen = useMobileAppStore((s) => s.setQueueSheetOpen);

  const showDevFixture = typeof __DEV__ !== "undefined" && __DEV__;



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



  const addDevFixtureLink = async () => {

    if (capturing) {

      return;

    }

    setCapturing(true);

    try {

      await addLinkCapture("示例链接", "https://example.com/fixture");

      setOpen(false);

      setQueueSheetOpen(true);

    } finally {

      setCapturing(false);

    }

  };



  return (

    <>

      {showFab ? (

        <Pressable style={[styles.fab, { backgroundColor: theme.accent }]} onPress={() => setOpen(true)} testID={testID}>

          <Text style={styles.fabText}>＋ 记下</Text>

        </Pressable>

      ) : null}

      <Modal visible={open} transparent animationType="fade">

        <View style={styles.backdrop}>

          <View style={[styles.sheet, { backgroundColor: theme.surface }]}>

            <Text style={[styles.title, { color: theme.text }]}>快速捕获</Text>

            <TextInput

              style={[styles.input, { backgroundColor: theme.surfaceMuted, color: theme.text }]}

              placeholder="文字或想法…"

              placeholderTextColor={theme.textTertiary}

              value={text}

              onChangeText={setText}

              testID="quick-capture-input"

            />

            <Pressable style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={submit} testID="quick-capture-submit">

              <Text style={styles.primaryBtnText}>加入待点亮星尘</Text>

            </Pressable>

            <TextInput

              style={[styles.input, { backgroundColor: theme.surfaceMuted, color: theme.text }]}

              placeholder="粘贴网页链接"

              placeholderTextColor={theme.textTertiary}

              value={linkUrl}

              onChangeText={setLinkUrl}

              autoCapitalize="none"

              testID="quick-capture-link-input"

            />

            <Pressable

              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}

              onPress={() => void submitLink()}

              disabled={capturing}

              testID="quick-capture-link-submit"

            >

              <Text style={styles.primaryBtnText}>

                {capturing ? "正在添加…" : "添加链接"}

              </Text>

            </Pressable>

            {showDevFixture ? (

              <Pressable

                style={styles.secondaryBtn}

                onPress={() => void addDevFixtureLink()}

                testID="quick-capture-dev-fixture"

              >

                <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>添加示例链接（开发）</Text>

              </Pressable>

            ) : null}

            {onOpenInbox ? (

              <Pressable

                style={styles.secondaryBtn}

                onPress={() => {

                  setOpen(false);

                  onOpenInbox();

                }}

                testID="quick-capture-open-inbox"

              >

                <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>打开待点亮星尘</Text>

              </Pressable>

            ) : null}

            <Pressable onPress={() => setOpen(false)}>

              <Text style={[styles.cancel, { color: theme.textSecondary }]}>取消</Text>

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

    borderTopLeftRadius: 20,

    borderTopRightRadius: 20,

    padding: 20,

  },

  title: {

    fontSize: 18,

    fontWeight: "600",

    marginBottom: 12,

  },

  input: {

    borderRadius: 12,

    padding: 12,

    marginBottom: 12,

  },

  primaryBtn: {

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

    fontWeight: "500",

  },

  cancel: {

    textAlign: "center",

    marginTop: 8,

  },

});


