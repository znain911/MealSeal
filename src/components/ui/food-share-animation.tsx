import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";

import { Colors, Radius } from "@/constants/theme";

import { Icon } from "./icon";

/**
 * A gentle, looping "someone shares a meal with someone else" motif: a meal icon travels
 * between two soft circles, each pulsing warmly as it gives / receives. Built from the app's
 * own icon set rather than literal emoji, to stay visually consistent with the rest of the UI —
 * and falls back to a still frame when the system's reduce-motion setting is on.
 */
export function FoodShareAnimation() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [travel] = useState(() => new Animated.Value(0));
  const [giveScale] = useState(() => new Animated.Value(1));
  const [receiveScale] = useState(() => new Animated.Value(1));
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

    const loop = Animated.loop(
      Animated.sequence([
        // Hand off: left -> right
        Animated.parallel([
          Animated.timing(travel, {
            toValue: 1,
            duration: 950,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(giveScale, { toValue: 1.12, duration: 200, useNativeDriver: true }),
            Animated.timing(giveScale, { toValue: 1, duration: 200, useNativeDriver: true }),
          ]),
        ]),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(receiveScale, { toValue: 1.15, duration: 220, useNativeDriver: true }),
            Animated.timing(receiveScale, { toValue: 1, duration: 260, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(sparkle, { toValue: 1, duration: 220, useNativeDriver: true }),
            Animated.delay(260),
            Animated.timing(sparkle, { toValue: 0, duration: 260, useNativeDriver: true }),
          ]),
        ]),
        Animated.delay(500),
        // Back: right -> left, ready for the next person
        Animated.timing(travel, {
          toValue: 0,
          duration: 950,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [reducedMotion, travel, giveScale, receiveScale, sparkle]);

  const travelX = travel.interpolate({ inputRange: [0, 1], outputRange: [-62, 62] });
  const travelLift = travel.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -22, 0] });
  const sparkleScale = sparkle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <View style={styles.row}>
      <Animated.View style={[styles.person, styles.personGive, { transform: [{ scale: giveScale }] }]}>
        <Icon name="heart" size={28} color={Colors.light.accentClay} />
      </Animated.View>

      <View style={styles.track}>
        <Animated.View
          style={[
            styles.sparkle,
            { opacity: sparkle, transform: [{ scale: sparkleScale }] },
          ]}
        >
          <Icon name="checks" size={18} color={Colors.light.primary} />
        </Animated.View>

        <Animated.View
          style={[
            styles.meal,
            reducedMotion ? null : { transform: [{ translateX: travelX }, { translateY: travelLift }] },
          ]}
        >
          <Icon name="meals" size={26} color="#FFFFFF" />
        </Animated.View>
      </View>

      <Animated.View style={[styles.person, styles.personReceive, { transform: [{ scale: receiveScale }] }]}>
        <Icon name="heart" size={28} color={Colors.light.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 120,
  },
  person: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  personGive: {
    backgroundColor: "#FBE7DB",
  },
  personReceive: {
    backgroundColor: Colors.light.primarySubtle,
  },
  track: {
    width: 140,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  meal: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2B2622",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sparkle: {
    position: "absolute",
    top: -8,
    right: 18,
  },
});
