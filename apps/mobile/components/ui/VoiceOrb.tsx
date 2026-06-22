import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { brainTheme, type ThemeMode } from "../../theme/tokens";

export type VoiceOrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error"
  | "degraded";

export interface VoiceOrbProps {
  state?: VoiceOrbState;
  reducedMotion?: boolean;
  themeMode?: ThemeMode;
  testID?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Readable error code for error state a11y (e.g. token exchange failure). */
  errorHint?: string | null;
}

const ORB_SIZE = 72;
const PULSE_MS = 2400;
const THINK_ROTATE_MS = 3200;

const DEFAULT_LABELS: Record<VoiceOrbState, string> = {
  idle: "语音助手待命中",
  listening: "正在聆听",
  thinking: "思考中",
  speaking: "正在说话 — 点击可打断",
  interrupted: "已打断，继续聆听",
  error: "语音出错",
  degraded: "语音不可用，可使用文字",
};

/** S15 a11y contract — maps VoiceOrb visual state to zh-CN labels. */
export function voiceOrbAccessibilityLabel(
  state: VoiceOrbState,
  errorHint?: string | null,
): string {
  if (state === "error" && errorHint?.trim()) {
    return `语音出错：${errorHint.trim()}`;
  }
  return DEFAULT_LABELS[state];
}

export function VoiceOrb({
  state = "idle",
  reducedMotion = false,
  themeMode = "dark",
  testID = "voice-orb",
  onPress,
  accessibilityLabel,
  errorHint = null,
}: VoiceOrbProps) {
  const theme = brainTheme[themeMode];
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(1)).current;

  const resolvedLabel = accessibilityLabel ?? voiceOrbAccessibilityLabel(state, errorHint);
  const speakingHint = state === "speaking" ? "双击打断" : undefined;

  useEffect(() => {
    if (reducedMotion || state !== "idle") {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: PULSE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reducedMotion, state]);

  useEffect(() => {
    if (reducedMotion || state !== "thinking") {
      rotate.stopAnimation();
      rotate.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: THINK_ROTATE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rotate, reducedMotion, state]);

  useEffect(() => {
    if (reducedMotion || state !== "interrupted") {
      flash.stopAnimation();
      flash.setValue(1);
      return;
    }

    const blink = Animated.sequence([
      Animated.timing(flash, {
        toValue: 0.35,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(flash, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    blink.start();
    return () => flash.stopAnimation();
  }, [flash, reducedMotion, state]);

  const speakingScale = state === "speaking" ? 1.08 : 1;
  const listeningBrightness = state === "listening" || state === "interrupted" ? 1.12 : 1;
  const coreColor =
    state === "listening" || state === "interrupted"
      ? theme.primary
      : state === "thinking"
        ? theme.primary
        : state === "error" || state === "degraded"
          ? theme.warning
          : theme.primary;

  const rotateDeg = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const glowOpacity =
    state === "interrupted" && !reducedMotion ? flash : listeningBrightness;

  const content = (
    <>
      <Animated.View
        testID={`${testID}-glow`}
        style={[
          styles.glow,
          {
            backgroundColor: theme.orbGlow,
            opacity: glowOpacity,
            transform: [{ scale: pulse }, { scale: speakingScale }],
          },
        ]}
      />
      <Animated.View
        testID={`${testID}-core`}
        style={[
          styles.core,
          {
            backgroundColor: coreColor,
            transform: [{ scale: pulse }, { rotate: state === "thinking" ? rotateDeg : "0deg" }],
          },
        ]}
      />
      {state === "speaking" ? (
        <View
          testID={`${testID}-speaking-ring`}
          style={[styles.speakingRing, { borderColor: theme.primary }]}
        />
      ) : null}
      {state === "degraded" || state === "error" ? (
        <View
          testID={`${testID}-degraded-ring`}
          style={[styles.degradedRing, { borderColor: theme.warning }]}
        />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={resolvedLabel}
        accessibilityHint={speakingHint}
        style={styles.wrap}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={resolvedLabel}
      accessibilityHint={speakingHint}
      style={styles.wrap}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
  },
  core: {
    width: ORB_SIZE * 0.72,
    height: ORB_SIZE * 0.72,
    borderRadius: (ORB_SIZE * 0.72) / 2,
  },
  speakingRing: {
    position: "absolute",
    width: ORB_SIZE * 0.92,
    height: ORB_SIZE * 0.92,
    borderRadius: (ORB_SIZE * 0.92) / 2,
    borderWidth: 2,
    opacity: 0.55,
  },
  degradedRing: {
    position: "absolute",
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 2,
  },
});
