import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  coldStartAssistantReply,
  deriveFirstStarCandidate,
  formatProfileModeLine,
  inferColdStartProfile,
  isColdStartDialogueComplete,
  cyclePrimaryMode,
  type FirstStarCandidate,
  type UserModeProfile,
} from "@my-brain/core";

import { useMobileAppStore } from "../stores/mobileAppStore";
import { colors } from "../theme/tokens";

interface DialogueLine {
  role: "user" | "assistant";
  text: string;
}

interface Props {
  testID?: string;
}

export function ColdStartDialogue({ testID = "cold-start-dialogue" }: Props) {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<DialogueLine[]>([
    { role: "assistant", text: "你更希望我帮你做什么？随便说，不用选类别。" },
  ]);
  const [userTurnCount, setUserTurnCount] = useState(0);
  const [pendingProfile, setPendingProfile] = useState<UserModeProfile | null>(null);
  const [firstStar, setFirstStar] = useState<FirstStarCandidate | null>(null);
  const completeColdStartWithFirstStar = useMobileAppStore((s) => s.completeColdStartWithFirstStar);
  const degraded = useMobileAppStore((s) => s.degraded);

  const utterances = useMemo(
    () => lines.filter((line) => line.role === "user").map((line) => line.text),
    [lines],
  );

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const nextTurn = userTurnCount + 1;
    const nextUtterances = [...utterances, trimmed];
    const nextLines: DialogueLine[] = [...lines, { role: "user", text: trimmed }];
    setUserTurnCount(nextTurn);
    setLines(nextLines);
    setInput("");

    if (isColdStartDialogueComplete(nextTurn)) {
      const profile = inferColdStartProfile(nextUtterances);
      setPendingProfile(profile);
      setLines([
        ...nextLines,
        { role: "assistant", text: coldStartAssistantReply(nextTurn) },
      ]);
      return;
    }

    setLines([...nextLines, { role: "assistant", text: coldStartAssistantReply(nextTurn) }]);
  };

  const correctPrimaryMode = () => {
    if (!pendingProfile) {
      return;
    }
    setPendingProfile({
      ...pendingProfile,
      primaryMode: cyclePrimaryMode(pendingProfile.primaryMode),
    });
  };

  const confirmProfile = () => {
    if (!pendingProfile) {
      return;
    }
    setFirstStar(deriveFirstStarCandidate(utterances, pendingProfile));
  };

  const confirmFirstStar = () => {
    if (!pendingProfile || !firstStar) {
      return;
    }
    completeColdStartWithFirstStar(pendingProfile, firstStar);
  };

  const showProfileReview = pendingProfile != null && firstStar == null && isColdStartDialogueComplete(userTurnCount);
  const showFirstStarReview = pendingProfile != null && firstStar != null;

  return (
    <View style={styles.wrap} testID={testID}>
      <ScrollView style={styles.scroll} testID="cold-start-scroll">
        {lines.map((line, i) => (
          <View
            key={`${line.role}-${i}`}
            style={[styles.bubble, line.role === "user" ? styles.userBubble : styles.aiBubble]}
          >
            <Text style={styles.bubbleText}>{line.text}</Text>
          </View>
        ))}
        {showProfileReview ? (
          <View style={styles.profileCard} testID="cold-start-profile-review">
            <Text style={styles.profileLabel}>识别结果 · 可纠偏</Text>
            <Pressable onPress={correctPrimaryMode} testID="cold-start-profile-summary">
              <Text style={styles.profileTitle}>
                {formatProfileModeLine(pendingProfile)} · 置信{" "}
                {Math.round(pendingProfile.confidence * 100)}%
              </Text>
            </Pressable>
            <Text style={styles.profileHint}>点摘要可切换主模式；进入前可在「我的画像」再改。</Text>
          </View>
        ) : null}
        {showFirstStarReview ? (
          <View style={styles.profileCard} testID="cold-start-first-star">
            <Text style={styles.profileLabel}>第一颗个人星 · 待你确认</Text>
            <Text style={styles.profileTitle}>{firstStar.concept}</Text>
            <Text style={styles.profileHint}>{firstStar.intro}</Text>
            <Text style={styles.profileHint}>确认后才会写入永久图谱。</Text>
          </View>
        ) : null}
      </ScrollView>
      {degraded.active.includes("profile_seed_degraded") ? (
        <Text style={styles.degradedHint} testID="profile-seed-degraded">
          画像识别：规则推断（无 API Key 时仍可按对话理解）
        </Text>
      ) : null}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="说说你今天想怎么用这个 App…"
          placeholderTextColor={colors.textMuted}
          testID="cold-start-input"
        />
        <Pressable style={styles.send} onPress={() => send(input)} testID="cold-start-send">
          <Text style={styles.sendText}>发送</Text>
        </Pressable>
      </View>
      {showProfileReview ? (
        <Pressable style={styles.enter} onPress={confirmProfile} testID="cold-start-confirm-profile">
          <Text style={styles.enterText}>确认画像，继续</Text>
        </Pressable>
      ) : null}
      {showFirstStarReview ? (
        <Pressable style={styles.enter} onPress={confirmFirstStar} testID="cold-start-light-star">
          <Text style={styles.enterText}>点亮第一颗星</Text>
        </Pressable>
      ) : null}
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
    maxHeight: 320,
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
    lineHeight: 22,
  },
  profileCard: {
    backgroundColor: "#252932",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFFFFF12",
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  profileLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  profileTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 6,
  },
  profileHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  degradedHint: {
    color: colors.accent,
    fontSize: 11,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
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
  enter: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  enterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
