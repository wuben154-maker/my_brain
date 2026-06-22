import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { colors, fontFamily, starOrbitTint } from "../theme/tokens";
import {
  LAUNCH_LOGO_FADE_MS,
  LAUNCH_TAGLINE_DELAY_MS,
  LAUNCH_TAGLINE_FADE_MS,
  LAUNCH_MAX_MS,
} from "../boot/launchTiming";
import { scheduleLaunchBootHandoff } from "../boot/launchBootHandoff";
import { isVisualFixtureRoute } from "../visual-fixtures/captureSession";

interface Props {
  onDone: () => void;
}

export {
  LAUNCH_LOGO_FADE_MS,
  LAUNCH_TAGLINE_DELAY_MS,
  LAUNCH_TAGLINE_FADE_MS,
  LAUNCH_MIN_MS,
  LAUNCH_MAX_MS,
} from "../boot/launchTiming";

const LOGO_FADE_MS = LAUNCH_LOGO_FADE_MS;
const TAGLINE_DELAY_MS = LAUNCH_TAGLINE_DELAY_MS;
const TAGLINE_FADE_MS = LAUNCH_TAGLINE_FADE_MS;

const STAR_CORE_SIZE = 232;
const STAR_CENTER = STAR_CORE_SIZE / 2;

function FourPointStar({ size, color }: { size: number; color: string }) {
  // SVG baseline uses an 8-vertex star polygon, not a thick plus cross.
  const arm = Math.max(2, Math.round(size * 0.14));
  const span = size;
  return (
    <View style={[styles.starWrap, { width: span, height: span }]}>
      <View
        style={[
          styles.starArm,
          {
            width: arm,
            height: span,
            backgroundColor: color,
            borderRadius: arm / 2,
          },
        ]}
      />
      <View
        style={[
          styles.starArm,
          {
            width: span,
            height: arm,
            backgroundColor: color,
            borderRadius: arm / 2,
          },
        ]}
      />
    </View>
  );
}

function SplashBackdrop() {
  return (
    <View style={styles.backdrop} pointerEvents="none">
      <View style={styles.bgGlowIndigo} />
      <View style={styles.bgGlowIndigoHalo} />
      <View style={styles.bgGlowWarm} />
    </View>
  );
}

export function LaunchScreen({ onDone }: Props) {
  const splashCapture =
    isVisualFixtureRoute("LaunchScreen") || isVisualFixtureRoute("LaunchAssets");
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const starScale = useRef(new Animated.Value(0.9)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (splashCapture) {
      logoOpacity.setValue(1);
      taglineOpacity.setValue(1);
      starScale.setValue(1);
      return;
    }

    scheduleLaunchBootHandoff();

    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: LOGO_FADE_MS,
        useNativeDriver: true,
      }),
      Animated.timing(starScale, {
        toValue: 1,
        duration: LOGO_FADE_MS,
        useNativeDriver: true,
      }),
    ]).start();

    const taglineTimer = setTimeout(() => {
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: TAGLINE_FADE_MS,
        useNativeDriver: true,
      }).start();
    }, TAGLINE_DELAY_MS);

    const doneTimer = setTimeout(() => {
      onDoneRef.current();
    }, LAUNCH_MAX_MS);

    return () => {
      clearTimeout(taglineTimer);
      clearTimeout(doneTimer);
    };
  }, [logoOpacity, splashCapture, starScale, taglineOpacity]);

  return (
    <View style={styles.root} testID="launch-screen">
      <SplashBackdrop />

      <View style={styles.heroColumn}>
        <Animated.View
          style={[
            styles.heroBlock,
            {
              opacity: logoOpacity,
              transform: [{ scale: starScale }],
            },
          ]}
        >
          <View style={styles.starCore} testID="launch-star-core">
            <View style={styles.glowOuter} />
            <View style={styles.glowMid} />
            <View style={styles.glowInner} />
            <FourPointStar size={40} color={colors.accent} />
            <View style={[styles.orbitStar, styles.orbitStarLeft]}>
              <FourPointStar size={10} color={colors.text} />
            </View>
            <View style={[styles.orbitStar, styles.orbitStarTop]}>
              <FourPointStar size={8} color={starOrbitTint} />
            </View>
            <View style={[styles.orbitStar, styles.orbitStarBottom]}>
              <FourPointStar size={8} color={colors.textMuted} />
            </View>
          </View>

          <Text style={styles.logo} testID="launch-brand">
            my_brain
          </Text>
        </Animated.View>

        <Animated.Text
          style={[styles.tagline, { opacity: taglineOpacity }]}
          testID="launch-tagline"
        >
          你的大脑，慢慢亮起来
        </Animated.Text>
      </View>

      <Text style={styles.footerMicro} testID="launch-footer-micro">
        本地优先 · 用户确认入库 · 可撤销整理
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  bgGlowIndigo: {
    position: "absolute",
    width: "150%",
    height: "58%",
    top: "-8%",
    left: "-25%",
    borderRadius: 9999,
    backgroundColor: colors.primary,
    opacity: 0.16,
  },
  bgGlowIndigoHalo: {
    position: "absolute",
    width: "120%",
    height: "70%",
    top: "-12%",
    left: "-10%",
    borderRadius: 9999,
    backgroundColor: colors.primary,
    opacity: 0.04,
  },
  bgGlowWarm: {
    position: "absolute",
    width: "90%",
    height: "48%",
    right: "-18%",
    bottom: "8%",
    borderRadius: 9999,
    backgroundColor: colors.accent,
    opacity: 0.12,
  },
  heroColumn: {
    width: "100%",
    alignItems: "center",
    paddingTop: "34.4%",
  },
  heroBlock: {
    alignItems: "center",
  },
  starCore: {
    width: STAR_CORE_SIZE,
    height: STAR_CORE_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  glowOuter: {
    position: "absolute",
    width: STAR_CORE_SIZE,
    height: STAR_CORE_SIZE,
    borderRadius: STAR_CENTER,
    backgroundColor: colors.primary,
    opacity: 0.11,
  },
  glowMid: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: colors.accent,
    opacity: 0.07,
  },
  glowInner: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accent,
    opacity: 0.13,
  },
  starWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  starArm: {
    position: "absolute",
  },
  orbitStar: {
    position: "absolute",
    opacity: 0.85,
  },
  orbitStarLeft: {
    left: STAR_CENTER - 51 - 5,
    top: STAR_CENTER - 48 - 5,
  },
  orbitStarTop: {
    left: STAR_CENTER + 55 - 4,
    top: STAR_CENTER - 61 - 4,
  },
  orbitStarBottom: {
    left: STAR_CENTER + 69 - 4,
    top: STAR_CENTER + 53 - 4,
  },
  logo: {
    color: colors.text,
    fontFamily: fontFamily.display,
    fontSize: 28,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  tagline: {
    color: colors.textMuted,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  footerMicro: {
    position: "absolute",
    bottom: 58,
    color: "#6B7280",
    fontFamily: fontFamily.body,
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.2,
    textAlign: "center",
  },
});
