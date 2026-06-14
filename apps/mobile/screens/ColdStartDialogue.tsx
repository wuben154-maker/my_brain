import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { COLD_START_FIXTURES, userModeLabel } from "@my-brain/core";

import { useUserModeProfile } from "../hooks/useUserModeProfile";
import { useMobileAppStore } from "../stores/mobileAppStore";
import { colors, copy } from "../theme/tokens";

interface Props {
  testID?: string;
}

export function ColdStartDialogue({ testID = "cold-start-dialogue" }: Props) {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: "你更希望我帮你做什么？随便说，不用选类别。" },
  ]);
  const { seedFromUtterances } = useUserModeProfile();
  const degraded = useMobileAppStore((s) => s.degraded);

  const send = (text: string, fixtureId?: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const nextLines = [...lines, { role: "user" as const, text: trimmed }];
    setLines(nextLines);
    setInput("");
    const utterances = nextLines.filter((l) => l.role === "user").map((l) => l.text);
    const profile = seedFromUtterances(utterances, fixtureId);
    setLines((prev) => [
      ...prev,
      {
        role: "assistant",
        text: `听起来你是「${userModeLabel(profile.primaryMode)}」向 — 我会按这个方式陪你。`,
      },
    ]);
  };

  return (
    <View style={styles.wrap} testID={testID}>
      <ScrollView style={styles.scroll}>
        {lines.map((line, i) => (
          <View
            key={`${line.role}-${i}`}
            style={[styles.bubble, line.role === "user" ? styles.userBubble : styles.aiBubble]}
          >
            <Text style={styles.bubbleText}>{line.text}</Text>
          </View>
        ))}
      </ScrollView>
      {degraded.active.includes("profile_seed_degraded") ? (
        <Text style={styles.degradedHint} testID="profile-seed-degraded">
          画像识别：演示推断（无 API Key）
        </Text>
      ) : null}
      <View style={styles.fixtures}>
        {COLD_START_FIXTURES.map((f) => (
          <Pressable
            key={f.id}
            style={styles.fixtureChip}
            onPress={() => send(f.userUtterance, f.id)}
            testID={`cold-fixture-${f.id}`}
          >
            <Text style={styles.fixtureText}>{f.id}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="随便聊聊…"
          placeholderTextColor={colors.textMuted}
          testID="cold-start-input"
        />
        <Pressable style={styles.send} onPress={() => send(input)} testID="cold-start-send">
          <Text style={styles.sendText}>发送</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  scroll: {
    flex: 1,
    maxHeight: 280,
  },
  bubble: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    maxWidth: "85%",
  },
  aiBubble: {
    backgroundColor: colors.surface,
    alignSelf: "flex-start",
  },
  userBubble: {
    backgroundColor: "#2a3355",
    alignSelf: "flex-end",
  },
  bubbleText: {
    color: colors.text,
    fontSize: 14,
  },
  degradedHint: {
    color: colors.accent,
    fontSize: 11,
    marginBottom: 6,
  },
  fixtures: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  fixtureChip: {
    backgroundColor: "#252836",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fixtureText: {
    color: colors.textMuted,
    fontSize: 10,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    color: colors.text,
  },
  send: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "600",
  },
});
