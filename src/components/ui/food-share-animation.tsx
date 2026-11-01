import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);

const HEART_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

/**
 * The warm "someone shares a meal with someone else" hero: two illustrated characters passing a
 * heart hand to hand, ported from the Claude Design warm-terracotta redesign (Nov 2026) into
 * react-native-svg. Falls back to a still frame when the system's reduce-motion setting is on.
 */
export function FoodShareAnimation() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [bob] = useState(() => new Animated.Value(0));
  const [armSwing] = useState(() => new Animated.Value(0));
  const [heart] = useState(() => new Animated.Value(0));
  const [sparkle] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!cancelled) setReducedMotion(reduced);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(armSwing, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(armSwing, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(heart, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(sparkle, { toValue: 1, duration: 220, useNativeDriver: true }),
              Animated.delay(260),
              Animated.timing(sparkle, { toValue: 0, duration: 260, useNativeDriver: true }),
            ]),
          ]),
          Animated.delay(500),
          Animated.timing(heart, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
          Animated.delay(400),
        ])
      ),
    ];

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [reducedMotion, bob, armSwing, heart, sparkle]);

  const giverLift = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const receiverLift = bob.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] });
  const giverArmAngle = armSwing.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-8deg"] });
  const receiverArmAngle = armSwing.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "8deg"] });

  const heartX = heart.interpolate({ inputRange: [0, 1], outputRange: [133, 257] });
  const heartY = heart.interpolate({ inputRange: [0, 0.5, 1], outputRange: [208, 150, 208] });
  const heartScale = heart.interpolate({ inputRange: [0, 0.1, 0.5, 0.9, 1], outputRange: [0.85, 1.1, 1, 1.1, 0.85] });
  const sparkleOpacity = reducedMotion ? 0 : sparkle;
  const sparkleScale = sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <View style={styles.wrap}>
      <Svg viewBox="0 0 390 360" width="100%" height="100%" role="img" aria-label="Two friendly characters passing a heart from one to the other">
        <Circle cx={195} cy={190} r={178} fill="#F9BB4C" />
        <Circle cx={195} cy={190} r={140} fill="#FBC55F" />
        <Ellipse cx={195} cy={336} rx={215} ry={24} fill="#E59D26" />
        <Circle cx={40} cy={60} r={5} fill="#FFF7E8" opacity={0.7} />
        <Circle cx={352} cy={46} r={4} fill="#FFF7E8" opacity={0.7} />
        <Circle cx={330} cy={96} r={3} fill="#FFF7E8" opacity={0.6} />
        <Circle cx={68} cy={110} r={3} fill="#FFF7E8" opacity={0.6} />

        {/* Giver */}
        <AnimatedG transform={[{ translateX: 10 }, { translateY: 128 }]}>
          <Ellipse cx={55} cy={206} rx={46} ry={7} fill="#3A2212" opacity={0.16} />
          {/* @ts-expect-error -- style (not react-native-svg's own `transform` prop) is what Animated knows how to resolve interpolated values through; RNSVG's types haven't caught up. */}
          <AnimatedG style={{ transform: [{ translateY: giverLift }] }}>
            <Path d="M24 126 L16 160" stroke="#D9531E" strokeWidth={16} strokeLinecap="round" fill="none" />
            <Circle cx={15} cy={163} r={9} fill="#F2B98A" />
            <Ellipse cx={40} cy={196} rx={15} ry={7} fill="#3A2212" />
            <Ellipse cx={70} cy={196} rx={15} ry={7} fill="#3A2212" />
            <Rect x={18} y={94} width={74} height={100} rx={34} fill="#D9531E" />
            <Path
              transform="translate(45,116) scale(.8)"
              fill="#FFF3DC"
              d={HEART_PATH}
            />
            {/* @ts-expect-error -- see note above on AnimatedG + style.transform */}
            <AnimatedG style={{ transform: [{ translateX: 88 }, { translateY: 118 }, { rotate: giverArmAngle }, { translateX: -88 }, { translateY: -118 }] }}>
              <Path d="M88 128 L124 112" stroke="#D9531E" strokeWidth={16} strokeLinecap="round" fill="none" />
              <Circle cx={128} cy={110} r={10} fill="#F2B98A" />
            </AnimatedG>
            <Circle cx={55} cy={60} r={38} fill="#F2B98A" />
            <Path d="M17 58 C17 30 36 18 55 18 C74 18 93 30 93 58 C84 44 70 38 55 38 C40 38 26 44 17 58 Z" fill="#3A2212" />
            <Circle cx={42} cy={64} r={4.2} fill="#3A2212" />
            <Circle cx={68} cy={64} r={4.2} fill="#3A2212" />
            <Circle cx={33} cy={76} r={6} fill="#E9744A" opacity={0.5} />
            <Circle cx={77} cy={76} r={6} fill="#E9744A" opacity={0.5} />
            <Path d="M46 78 Q55 88 64 78" stroke="#3A2212" strokeWidth={3.5} strokeLinecap="round" fill="none" />
          </AnimatedG>
        </AnimatedG>

        {/* Receiver (mirrored) */}
        <AnimatedG transform={[{ translateX: 380 }, { translateY: 128 }, { scaleX: -1 }]}>
          <Ellipse cx={55} cy={206} rx={46} ry={7} fill="#3A2212" opacity={0.16} />
          {/* @ts-expect-error -- see note above on AnimatedG + style.transform */}
          <AnimatedG style={{ transform: [{ translateY: receiverLift }] }}>
            <Path d="M24 126 L16 160" stroke="#FFF3DC" strokeWidth={16} strokeLinecap="round" fill="none" />
            <Circle cx={15} cy={163} r={9} fill="#B9774A" />
            <Ellipse cx={40} cy={196} rx={15} ry={7} fill="#3A2212" />
            <Ellipse cx={70} cy={196} rx={15} ry={7} fill="#3A2212" />
            <Rect x={18} y={94} width={74} height={100} rx={34} fill="#FFF3DC" />
            <Rect x={24} y={90} width={62} height={14} rx={7} fill="#F2A413" />
            {/* @ts-expect-error -- see note above on AnimatedG + style.transform */}
            <AnimatedG style={{ transform: [{ translateX: 88 }, { translateY: 118 }, { rotate: receiverArmAngle }, { translateX: -88 }, { translateY: -118 }] }}>
              <Path d="M88 128 L124 112" stroke="#FFF3DC" strokeWidth={16} strokeLinecap="round" fill="none" />
              <Circle cx={128} cy={110} r={10} fill="#B9774A" />
            </AnimatedG>
            <Circle cx={55} cy={60} r={38} fill="#B9774A" />
            <Path d="M16 56 C16 26 35 16 55 16 C75 16 94 26 94 56 Z" fill="#7A3E1D" />
            <Rect x={13} y={48} width={84} height={12} rx={6} fill="#5E2D14" />
            <Circle cx={55} cy={14} r={7} fill="#F2A413" />
            <Circle cx={42} cy={68} r={4.2} fill="#3A2212" />
            <Circle cx={68} cy={68} r={4.2} fill="#3A2212" />
            <Circle cx={33} cy={79} r={6} fill="#E0764A" opacity={0.6} />
            <Circle cx={77} cy={79} r={6} fill="#E0764A" opacity={0.6} />
            <Path d="M46 80 Q55 90 64 80" stroke="#3A2212" strokeWidth={3.5} strokeLinecap="round" fill="none" />
          </AnimatedG>
        </AnimatedG>

        {/* Travelling heart */}
        {/* @ts-expect-error -- see note above on AnimatedG + style.transform */}
        <AnimatedG style={{ transform: [{ translateX: reducedMotion ? 195 : heartX }, { translateY: reducedMotion ? 150 : heartY }, { scale: reducedMotion ? 1 : heartScale }] }}>
          <Path transform="translate(-18,-18) scale(1.5)" fill="#D92D20" d={HEART_PATH} />
        </AnimatedG>

        {/* Sparkle burst near the receiver */}
        {/* @ts-expect-error -- see note above on AnimatedG + style.transform */}
        <AnimatedG style={{ opacity: sparkleOpacity, transform: [{ translateX: 296 }, { translateY: 126 }, { scale: sparkleScale }] }}>
          <Path transform="scale(.7)" fill="#D92D20" d={HEART_PATH} />
        </AnimatedG>
        {/* @ts-expect-error -- see note above on AnimatedG + style.transform */}
        <AnimatedG style={{ opacity: sparkleOpacity, transform: [{ translateX: 336 }, { translateY: 110 }, { scale: sparkleScale }] }}>
          <Path transform="scale(.55)" fill="#FFF7E8" d={HEART_PATH} />
        </AnimatedG>
        {/* @ts-expect-error -- see note above on AnimatedG + style.transform */}
        <AnimatedG style={{ opacity: sparkleOpacity, transform: [{ translateX: 358 }, { translateY: 142 }, { scale: sparkleScale }] }}>
          <Path transform="scale(.5)" fill="#D92D20" d={HEART_PATH} />
        </AnimatedG>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    height: 140,
  },
});
